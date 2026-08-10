import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event_id, player_id, comment = "" } = body;

    if (!event_id || !player_id) {
      return NextResponse.json({ error: "Termin und Spieler sind erforderlich." }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("responses")
      .upsert({ event_id, player_id, comment: String(comment).slice(0, 300) }, { onConflict: "event_id,player_id" })
      .select("id,event_id,player_id,comment,players(id,name)")
      .single();

    if (error) throw error;
    return NextResponse.json({ response: data });
  } catch {
    return NextResponse.json({ error: "Zusage konnte nicht gespeichert werden." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Antwort fehlt." }, { status: 400 });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("responses")
      .update({ comment: String(body.comment || "").slice(0, 300) })
      .eq("id", body.id)
      .select("id,event_id,player_id,comment,players(id,name)")
      .single();

    if (error) throw error;
    return NextResponse.json({ response: data });
  } catch {
    return NextResponse.json({ error: "Kommentar konnte nicht gespeichert werden." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    if (!body.event_id || !body.player_id) {
      return NextResponse.json({ error: "Termin und Spieler sind erforderlich." }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from("responses")
      .delete()
      .eq("event_id", body.event_id)
      .eq("player_id", body.player_id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Zusage konnte nicht entfernt werden." }, { status: 500 });
  }
}