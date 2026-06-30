"use client";

import dynamic from "next/dynamic";
import "mapbox-gl/dist/mapbox-gl.css";

import type { MapMouseEvent, MapRef, ViewStateChangeEvent } from "react-map-gl/mapbox";
import Map, { Marker, NavigationControl, type ViewState } from "react-map-gl/mapbox";
import Supercluster from "supercluster";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Loader2, MapPinOff } from "lucide-react";

import { FilterBar } from "@/components/home/filter-bar";
import { PriceMarker } from "@/components/home/price-marker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fetchParkingSpotDetail } from "@/lib/actions/spots";
import { DEFAULT_FILTERS, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, LOCATION_PRESETS, MAPBOX_STYLE } from "@/lib/constants";
import type { SpotReservation } from "@/lib/data/demo-bookings";
import { spotsToGeoJson } from "@/lib/mapbox";
import { isDemoSpot, isUserOwnedListing } from "@/lib/domain/spot-ownership";
import { formatCurrency, isSpotAvailableNow } from "@/lib/utils";
import type { MapSpotSummary, ParkingSpot, SpotFilters } from "@/types";

const SpotCard = dynamic(
  () => import("@/components/home/spot-card").then((mod) => mod.SpotCard),
  {
    loading: () => (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }
);

const INITIAL_VIEW_STATE: ViewState = {
  latitude: DEFAULT_MAP_CENTER.latitude,
  longitude: DEFAULT_MAP_CENTER.longitude,
  zoom: DEFAULT_MAP_ZOOM,
  bearing: 0,
  pitch: 0,
  padding: { top: 16, bottom: 16, left: 16, right: 16 }
};

interface ParkingMapProps {
  spots: MapSpotSummary[];
  currentUserId?: string | null;
  highlightSpotId?: string;
  reservations?: SpotReservation[];
}

function isRenderableSpot(spot: MapSpotSummary) {
  return Number.isFinite(spot.latitude) && Number.isFinite(spot.longitude);
}

function getMarkerKey(spot: MapSpotSummary) {
  return `${spot.id.startsWith("demo-") ? "demo" : "real"}-${spot.id}`;
}

function matchesFilters(spot: MapSpotSummary, filters: SpotFilters, locationQuery = "") {
  const searchHaystack = `${spot.title} ${spot.description} ${spot.locationNotes}`.toLowerCase();
  const normalizedLocation = locationQuery.trim().toLowerCase();

  const matchesLocation = (() => {
    if (!normalizedLocation) {
      return true;
    }

    const preset = LOCATION_PRESETS[normalizedLocation];
    if (preset) {
      const latDiff = Math.abs(spot.latitude - preset.latitude);
      const lngDiff = Math.abs(spot.longitude - preset.longitude);
      return latDiff < 0.025 && lngDiff < 0.03;
    }

    return searchHaystack.includes(normalizedLocation);
  })();

  return (
    spot.pricePerHour <= filters.maxPrice &&
    (!filters.search || searchHaystack.includes(filters.search.toLowerCase())) &&
    matchesLocation &&
    (!filters.availableNow || isSpotAvailableNow(spot.availabilityWindows)) &&
    (!filters.coveredOnly || spot.covered) &&
    (!filters.evChargingOnly || spot.hasEvCharger) &&
    (filters.type === "all" || spot.spotType === filters.type)
  );
}

function MissingMapboxToken() {
  return (
    <Card>
      <CardContent className="flex min-h-[560px] flex-col items-center justify-center gap-4 text-center">
        <MapPinOff className="h-10 w-10 text-muted-foreground" />
        <div>
          <h2 className="font-display text-2xl font-semibold">Mapbox token missing</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local and restart npm run dev.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ParkingMap({ spots, currentUserId, highlightSpotId, reservations = [] }: ParkingMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const safeSpots = useMemo(
    () => (Array.isArray(spots) ? spots.filter(isRenderableSpot) : []),
    [spots]
  );
  const reservationsBySpotId = useMemo(() => {
    const byId: Record<string, SpotReservation> = {};
    for (const reservation of reservations) {
      byId[reservation.spotId] = reservation;
    }
    return byId;
  }, [reservations]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [mapReady, setMapReady] = useState(false);

  const filteredSpots = useMemo(
    () => safeSpots.filter((spot) => matchesFilters(spot, filters, locationQuery)),
    [filters, locationQuery, safeSpots]
  );

  const filteredSpotsById = useMemo(() => {
    const byId: Record<string, MapSpotSummary> = {};
    for (const spot of filteredSpots) {
      byId[spot.id] = spot;
    }
    return byId;
  }, [filteredSpots]);

  const geoJson = useMemo(() => spotsToGeoJson(filteredSpots), [filteredSpots]);
  const clusterEngine = useMemo(() => {
    const engine = new Supercluster({
      radius: 68,
      maxZoom: 16
    });

    engine.load(
      geoJson.features.map((feature) => ({
        type: "Feature" as const,
        properties: feature.properties,
        geometry: feature.geometry
      }))
    );

    return engine;
  }, [geoJson]);

  const clusters = useMemo(() => {
    if (mapReady) {
      const map = mapRef.current?.getMap();
      const mapBounds = map?.getBounds();

      if (mapBounds) {
        return clusterEngine.getClusters(
          [mapBounds.getWest(), mapBounds.getSouth(), mapBounds.getEast(), mapBounds.getNorth()],
          Math.round(viewState.zoom)
        );
      }
    }

    return clusterEngine.getClusters(
      [
        viewState.longitude - 0.2,
        viewState.latitude - 0.14,
        viewState.longitude + 0.2,
        viewState.latitude + 0.14
      ],
      Math.round(viewState.zoom)
    );
  }, [clusterEngine, mapReady, viewState]);

  const loadSpotDetail = useCallback((spotId: string) => {
    setSelectedSpotId(spotId);
    setDetailError(null);
    setSelectedSpot(null);

    startTransition(async () => {
      const spot = await fetchParkingSpotDetail(spotId);
      if (!spot) {
        setDetailError("Could not load spot details.");
        return;
      }
      setSelectedSpot(spot);
    });
  }, []);

  useEffect(() => {
    if (!highlightSpotId) {
      return;
    }

    const highlighted = safeSpots.find((spot) => spot.id === highlightSpotId);
    if (!highlighted) {
      return;
    }

    loadSpotDetail(highlightSpotId);
    if (mapReady) {
      mapRef.current?.flyTo({
        center: [highlighted.longitude, highlighted.latitude],
        zoom: 15.2,
        duration: 1200,
        essential: true
      });
    }
  }, [highlightSpotId, loadSpotDetail, mapReady, safeSpots]);

  useEffect(() => {
    if (selectedSpotId && !filteredSpots.some((spot) => spot.id === selectedSpotId)) {
      setSelectedSpotId(null);
      setSelectedSpot(null);
      setDetailError(null);
    }
  }, [filteredSpots, selectedSpotId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedSpotId(null);
        setSelectedSpot(null);
        setDetailError(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleFilterChange = (next: SpotFilters) => {
    setFilters(next);
    setSelectedSpotId(null);
    setSelectedSpot(null);
    setDetailError(null);
  };

  const handleApplyLocation = () => {
    const normalizedLocation = locationQuery.trim().toLowerCase();
    if (!normalizedLocation) {
      setLocationError(null);
      return;
    }

    const preset = LOCATION_PRESETS[normalizedLocation];
    if (!preset) {
      setLocationError("Location not found.");
      return;
    }

    setLocationError(null);
    if (!mapReady) {
      return;
    }

    mapRef.current?.flyTo({
      center: [preset.longitude, preset.latitude],
      zoom: preset.zoom,
      duration: 1600,
      essential: true
    });
  };

  const handleMapClick = (event: MapMouseEvent) => {
    if (event.originalEvent.defaultPrevented) {
      return;
    }

    setSelectedSpotId(null);
    setSelectedSpot(null);
    setDetailError(null);
  };

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!mapboxToken) {
    return <MissingMapboxToken />;
  }

  return (
    <section className="flex h-full flex-col space-y-4">
      <Card className="w-full border-white/60 bg-white/75 transition-all duration-300 ease-smooth hover:shadow-soft">
        <CardContent className="p-3">
          <FilterBar
            filters={filters}
            locationQuery={locationQuery}
            locationError={locationError}
            summary={
              <div className="flex w-full flex-nowrap items-center justify-center gap-4">
                <Badge variant="outline" className="shrink-0 whitespace-nowrap px-1.5 py-0 text-[9px] font-semibold uppercase leading-5 tracking-[0.12em]">
                  {filteredSpots.length} spots found
                </Badge>
                <Badge variant="success" className="shrink-0 whitespace-nowrap px-1.5 py-0 text-[9px] font-semibold uppercase leading-5 tracking-[0.12em]">
                  {filteredSpots.length > 0
                    ? `From ${formatCurrency(Math.min(...filteredSpots.map((spot) => spot.pricePerHour)))}/hr`
                    : "No matches"}
                </Badge>
              </div>
            }
            onChange={handleFilterChange}
            onLocationQueryChange={(value) => {
              setLocationQuery(value);
              setSelectedSpotId(null);
              setSelectedSpot(null);
              setDetailError(null);
              if (locationError) {
                setLocationError(null);
              }
            }}
            onApply={handleApplyLocation}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_0.85fr]">
        <div className="relative h-[22rem] overflow-hidden rounded-[2rem] border border-white/70 bg-slate-100 shadow-floating lg:h-[34rem]">
          <Map
            ref={mapRef}
            reuseMaps
            mapboxAccessToken={mapboxToken}
            initialViewState={INITIAL_VIEW_STATE}
            mapStyle={MAPBOX_STYLE}
            style={{ width: "100%", height: "100%" }}
            dragPan
            scrollZoom
            doubleClickZoom
            touchZoomRotate
            dragRotate={false}
            pitchWithRotate={false}
            maxPitch={0}
            onLoad={() => setMapReady(true)}
            onMoveEnd={(event: ViewStateChangeEvent) => setViewState(event.viewState)}
            onClick={handleMapClick}
          >
            <NavigationControl position="top-right" />

            {clusters.map((feature) => {
              const [longitude, latitude] = feature.geometry.coordinates as [number, number];
              const isCluster = Boolean(feature.properties.cluster);

              if (isCluster) {
                const clusterId = feature.properties.cluster_id as number;
                return (
                  <Marker key={`cluster-${feature.id}`} longitude={longitude} latitude={latitude}>
                    <button
                      type="button"
                      className="interactive-scale flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white shadow-floating"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!mapReady) {
                          return;
                        }
                        const expansionZoom = clusterEngine.getClusterExpansionZoom(clusterId);
                        mapRef.current?.flyTo({
                          center: [longitude, latitude],
                          zoom: expansionZoom,
                          duration: 500,
                          essential: true
                        });
                      }}
                    >
                      {feature.properties.point_count}
                    </button>
                  </Marker>
                );
              }

              const spot = filteredSpotsById[feature.properties.spotId as string];
              if (!spot) {
                return null;
              }

              return (
                <Marker
                  key={getMarkerKey(spot)}
                  longitude={spot.longitude}
                  latitude={spot.latitude}
                  anchor="bottom"
                  onClick={(event) => {
                    event.originalEvent.preventDefault();
                    event.originalEvent.stopPropagation();
                    loadSpotDetail(spot.id);
                  }}
                >
                  <PriceMarker
                    price={spot.pricePerHour}
                    active={selectedSpotId === spot.id}
                    isOwnerListing={isUserOwnedListing(spot, currentUserId)}
                    isDemo={isDemoSpot(spot.id)}
                    isReserved={Boolean(reservationsBySpotId[spot.id])}
                  />
                </Marker>
              );
            })}
          </Map>
        </div>

        <div className="h-[22rem] lg:h-[34rem]">
          {isPending ? (
            <Card className="h-full">
              <CardContent className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                Loading spot details...
              </CardContent>
            </Card>
          ) : selectedSpot ? (
            <Card className="h-full overflow-hidden">
              <CardContent
                className="h-full overflow-y-auto p-4"
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <SpotCard
                  spot={selectedSpot}
                  onClose={() => {
                    setSelectedSpotId(null);
                    setSelectedSpot(null);
                    setDetailError(null);
                  }}
                  currentUserId={currentUserId}
                  reservation={reservationsBySpotId[selectedSpot.id] ?? null}
                />
              </CardContent>
            </Card>
          ) : detailError ? (
            <Card className="h-full">
              <CardContent className="flex h-full items-center justify-center text-center text-sm text-rose-700">
                {detailError}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full">
              <CardContent className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                {safeSpots.length > 0
                  ? "Select a marker to preview a parking spot."
                  : "No parking spots are available yet."}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
