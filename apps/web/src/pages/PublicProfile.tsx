import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { PublicProfile as PublicProfileType } from "@linkbio/types";

function trackView(username: string) {
  // Fire and forget — non-blocking
  fetch(`/api/v1/p/${username}/view`, { method: "POST" }).catch(() => null);
}

function trackClick(username: string, linkId: string) {
  fetch(`/api/v1/p/${username}/click/${linkId}`, { method: "POST" }).catch(() => null);
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => api.get<{ data: PublicProfileType }>(`/p/${username}`),
    enabled: !!username,
    retry: false,
  });

  const profile = data?.data.data;

  useEffect(() => {
    if (profile && username) trackView(username);
  }, [profile, username]);

  useEffect(() => {
    if (profile) {
      document.title = `${profile.displayName} | LinkBio`;
    }
  }, [profile]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <p className="text-5xl mb-4">🔗</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-500 text-sm">
          This page doesn't exist or hasn't been published yet.
        </p>
        <a href="/" className="mt-6 text-brand-600 text-sm underline">
          Create your own page →
        </a>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center py-12 px-4"
      style={{ backgroundColor: profile.theme.backgroundColor }}
    >
      {/* SEO meta via document.title is enough for MVP */}

      <div className="w-full max-w-sm">
        {/* Avatar */}
        <div className="flex justify-center mb-4">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-3xl font-bold shadow-md">
              {profile.displayName[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Name + bio */}
        <div className="text-center mb-6">
          <h1
            className="text-xl font-bold mb-1"
            style={{ color: profile.theme.textColor }}
          >
            {profile.displayName}
          </h1>
          {profile.bio && (
            <p className="text-sm opacity-70" style={{ color: profile.theme.textColor }}>
              {profile.bio}
            </p>
          )}
        </div>

        {/* Links */}
        <div className="space-y-3">
          {profile.links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => username && trackClick(username, link.id)}
              className={`block w-full text-center py-3.5 px-6 font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${
                profile.theme.cardStyle === "pill"
                  ? "rounded-full"
                  : profile.theme.cardStyle === "sharp"
                  ? "rounded-none"
                  : "rounded-xl"
              }`}
              style={{
                backgroundColor: profile.theme.accentColor ?? "#111827",
                color: "#ffffff",
              }}
            >
              {link.icon && <span className="mr-2">{link.icon}</span>}
              {link.title}
            </a>
          ))}
        </div>

        {/* Branding footer */}
        <p className="text-center text-xs text-gray-400 mt-10">
          Made with{" "}
          <a href="/" className="underline hover:text-gray-600">
            LinkBio
          </a>
        </p>
      </div>
    </div>
  );
}
