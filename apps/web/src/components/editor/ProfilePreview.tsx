import { Profile, Link as LinkType } from "@linkbio/types";

interface Props {
  profile: (Profile & { links?: LinkType[] }) | undefined;
  links: LinkType[];
  device: "mobile" | "desktop";
}

export default function ProfilePreview({ profile, links, device }: Props) {
  const activeLinks = links.filter((l) => l.isActive);

  const containerClass =
    device === "mobile"
      ? "w-60 h-[500px] rounded-[32px] border-4 border-gray-800 shadow-2xl overflow-hidden bg-white"
      : "w-72 h-[480px] rounded-xl border border-gray-300 shadow-lg overflow-hidden bg-white";

  return (
    <div className={containerClass}>
      <div className="h-full overflow-auto scrollbar-hide p-5">
        <div className="flex flex-col items-center gap-3">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              (profile?.displayName?.[0] ?? "?").toUpperCase()
            )}
          </div>

          {/* Display name */}
          <div className="text-center">
            <p className="font-semibold text-gray-900 text-sm">
              {profile?.displayName ?? "Your Name"}
            </p>
            {profile?.bio && (
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{profile.bio}</p>
            )}
          </div>

          {/* Links */}
          <div className="w-full space-y-2 mt-2">
            {activeLinks.length === 0 ? (
              <div className="text-center text-xs text-gray-400 py-4">Your links appear here</div>
            ) : (
              activeLinks.map((link) => (
                <div
                  key={link.id}
                  className="w-full bg-gray-900 text-white text-xs font-medium py-2.5 px-4 rounded-lg text-center truncate"
                >
                  {link.icon && <span className="mr-1.5">{link.icon}</span>}
                  {link.title}
                </div>
              ))
            )}
          </div>

          {/* Branding */}
          <p className="text-[10px] text-gray-300 mt-4">Made with LinkBio</p>
        </div>
      </div>
    </div>
  );
}
