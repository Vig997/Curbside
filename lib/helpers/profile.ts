export function deriveProfileName(user: {
  email?: string | null;
  user_metadata?: {
    full_name?: string | null;
    name?: string | null;
  };
}) {
  const fullName = user.user_metadata?.full_name?.trim();
  if (fullName) {
    return fullName;
  }

  const name = user.user_metadata?.name?.trim();
  if (name) {
    return name;
  }

  const emailPrefix = user.email?.split("@")[0]?.trim();
  if (emailPrefix) {
    return emailPrefix;
  }

  return "Curbside User";
}

