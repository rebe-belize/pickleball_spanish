import { getSupabase } from "@/lib/supabase";
import PlayerApp from "./player-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = getSupabase();

  // Zeitzonen-Kulanz: Lädt Events ab Beginn des heutigen Tages
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [{ data: players, error: playersError }, { data: events, error: eventsError }] =
    await Promise.all([
      supabase.from("players").select("id,name").eq("active", true).order("name"),
      supabase
        .from("events")
        .select("id,starts_at,ends_at,location,notes")
        .eq("active", true)
        .gte("starts_at", today.toISOString())
        .order("starts_at", { ascending: true })
    ]);

  if (playersError || eventsError) {
    return (
      <main className="page">
        <div className="container">
          <div className="error">
            The database is not configured yet. Please check your Supabase configuration.
          </div>
        </div>
      </main>
    );
  }

  const eventIds = (events ?? []).map((e) => e.id);
  const { data: responses } = eventIds.length
    ? await supabase
        .from("responses")
        .select("id,event_id,player_id,comment,players(id,name)")
        .in("event_id", eventIds)
    : { data: [] };

  return (
    <PlayerApp
      initialPlayers={players ?? []}
      initialEvents={events ?? []}
      initialResponses={responses ?? []}
    />
  );
}