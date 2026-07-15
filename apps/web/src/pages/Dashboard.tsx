import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { createLinkSchema, CreateLinkInput } from "@linkbio/validators";
import { Link as LinkType, Profile } from "@linkbio/types";
import { api } from "../lib/api";
import AppShell from "../components/ui/AppShell";
import ProfilePreview from "../components/editor/ProfilePreview";

function SortableLink({
  link,
  onDelete,
  onToggle,
}: {
  link: LinkType;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: link.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 group"
    >
      <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{link.title}</p>
        <p className="text-xs text-gray-400 truncate">{link.url}</p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onToggle(link.id, !link.isActive)}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
          title={link.isActive ? "Hide link" : "Show link"}
        >
          {link.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          onClick={() => onDelete(link.id)}
          className="p-1.5 text-gray-400 hover:text-red-500 rounded"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const qc = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");

  const { data: profileRes } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<{ data: Profile & { links: LinkType[] } }>("/profile"),
  });

  const { data: linksRes } = useQuery({
    queryKey: ["links"],
    queryFn: () => api.get<{ data: LinkType[] }>("/links"),
  });

  const profile = profileRes?.data.data;
  const links = linksRes?.data.data ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateLinkInput>({
    resolver: zodResolver(createLinkSchema),
  });

  const addLink = useMutation({
    mutationFn: (data: CreateLinkInput) => api.post("/links", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["links"] }); reset(); setShowAddForm(false); },
  });

  const deleteLink = useMutation({
    mutationFn: (id: string) => api.delete(`/links/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["links"] }),
  });

  const toggleLink = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/links/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["links"] }),
  });

  const reorder = useMutation({
    mutationFn: (reordered: { id: string; position: number }[]) =>
      api.put("/links/reorder", { links: reordered }),
  });

  const togglePublish = useMutation({
    mutationFn: (isPublished: boolean) => api.put("/profile", { isPublished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = links.findIndex((l) => l.id === active.id);
    const newIndex = links.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(links, oldIndex, newIndex).map((l, i) => ({
      id: l.id,
      position: i,
    }));

    reorder.mutate(reordered);
    qc.setQueryData(["links"], (old: { data: { data: LinkType[] } }) => ({
      ...old,
      data: { data: arrayMove(links, oldIndex, newIndex) },
    }));
  }

  const profileUrl = profile ? `${window.location.origin}/${profile.username}` : null;

  return (
    <AppShell>
      <div className="flex h-screen overflow-hidden">
        {/* Editor Panel */}
        <div className="flex-1 overflow-auto p-6 max-w-xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold text-gray-900">Your page</h1>
            <div className="flex items-center gap-3">
              {profileUrl && (
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-brand-600 flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View
                </a>
              )}
              <button
                onClick={() => togglePublish.mutate(!profile?.isPublished)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  profile?.isPublished
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {profile?.isPublished ? "Published" : "Unpublished"}
              </button>
            </div>
          </div>

          {/* Links list */}
          <div className="space-y-2 mb-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                {links.map((link) => (
                  <SortableLink
                    key={link.id}
                    link={link}
                    onDelete={(id) => deleteLink.mutate(id)}
                    onToggle={(id, isActive) => toggleLink.mutate({ id, isActive })}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {links.length === 0 && !showAddForm && (
              <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                No links yet. Add your first link below.
              </div>
            )}
          </div>

          {/* Add link form */}
          {showAddForm ? (
            <form
              onSubmit={handleSubmit((d) => addLink.mutate(d))}
              className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
            >
              <div>
                <input
                  {...register("title")}
                  placeholder="Title (e.g. My YouTube Channel)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <input
                  {...register("url")}
                  placeholder="URL (https://...)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {errors.url && <p className="text-red-500 text-xs mt-1">{errors.url.message}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addLink.isPending}
                  className="flex-1 bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
                >
                  {addLink.isPending ? "Adding…" : "Add link"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); reset(); }}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add link
            </button>
          )}
        </div>

        {/* Live Preview Panel */}
        <div className="w-80 bg-gray-100 border-l border-gray-200 flex flex-col items-center p-6 gap-4 shrink-0">
          <div className="flex gap-2">
            {(["mobile", "desktop"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setPreviewDevice(d)}
                className={`px-3 py-1 text-xs rounded-lg capitalize font-medium ${
                  previewDevice === d ? "bg-white shadow text-gray-900" : "text-gray-500"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <ProfilePreview profile={profile} links={links} device={previewDevice} />
        </div>
      </div>
    </AppShell>
  );
}
