"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { useEffect, useMemo, useRef } from "react";
import Map, { Marker, NavigationControl, type MapMouseEvent, type MapRef } from "react-map-gl/mapbox";
import { MapPin } from "lucide-react";

import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, MAPBOX_STYLE } from "@/lib/config/constants";

interface HostPinMapProps {
  latitude: number;
  longitude: number;
  onChange: (coordinates: { latitude: number; longitude: number }) => void;
}

export function HostPinMap({ latitude, longitude, onChange }: HostPinMapProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef | null>(null);
  const center = useMemo(
    () => ({
      latitude: Number.isFinite(latitude) ? latitude : DEFAULT_MAP_CENTER.latitude,
      longitude: Number.isFinite(longitude) ? longitude : DEFAULT_MAP_CENTER.longitude
    }),
    [latitude, longitude]
  );

  useEffect(() => {
    mapRef.current?.flyTo({
      center: [center.longitude, center.latitude],
      duration: 0,
      essential: true
    });
  }, [center.latitude, center.longitude]);

  if (!mapboxToken) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-[2rem] border border-dashed border-border bg-surface/80 p-6 text-center text-sm text-muted-foreground">
        Add `NEXT_PUBLIC_MAPBOX_TOKEN` to place a pin on the map.
      </div>
    );
  }

  const handleClick = (event: MapMouseEvent) => {
    onChange({
      latitude: event.lngLat.lat,
      longitude: event.lngLat.lng
    });
  };

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/70 shadow-soft">
      <Map
        ref={mapRef}
        reuseMaps
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          latitude: center.latitude,
          longitude: center.longitude,
          zoom: DEFAULT_MAP_ZOOM
        }}
        mapStyle={MAPBOX_STYLE}
        onClick={handleClick}
        style={{ width: "100%", minHeight: 360 }}
      >
        <NavigationControl position="top-right" />
        <Marker
          latitude={center.latitude}
          longitude={center.longitude}
          draggable
          onDragEnd={(event) =>
            onChange({
              latitude: event.lngLat.lat,
              longitude: event.lngLat.lng
            })
          }
        >
          <div className="rounded-full bg-slate-950 p-3 text-white shadow-floating">
            <MapPin className="h-5 w-5" />
          </div>
        </Marker>
      </Map>
    </div>
  );
}
