import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server-Side Supabase variables are missing.");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function isAdmin() {
  const store = await cookies();
  return store.get("pb_admin")?.value === "1";
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const supabase = adminClient();

  const [{ data: players, error: pErr }, { data: events, error: eErr }] = await Promise.all([
    supabase.from("players").select("id,name,active").order("name"),
    supabase.from("events").select("id,starts_at,ends_at,location,notes,active").order("starts_at", { ascending: true })
  ]);

  if (pErr) console.error("Error fetching players:", pErr);
  if (eErr) console.error("Error fetching events:", eErr);

  return NextResponse.json({ players: players || [], events: events || [] });
}

export async function POST(req: Request) {
  const body = await req.json();

  // Login
  if (body.action === "login") {
    if (!process.env.ADMIN_PASSWORD || body.password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid password." }, { status: 401 });
    }
    const store = await cookies();
    store.set("pb_admin", "1", { 
      httpOnly: true, 
      sameSite: "lax", 
      secure: process.env.NODE_ENV === "production", 
      maxAge: 60 * 60 * 8, 
      path: "/" 
    });
    return NextResponse.json({ ok: true });
  }

  // Logout
  if (body.action === "logout") {
    const store = await cookies();
    store.set("pb_admin", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
      path: "/"
    });
    return NextResponse.json({ ok: true });
  }

  // Ab hier nur für authentifizierte Admins
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const supabase = adminClient();

  // Spieler hinzufügen
  if (body.action === "add_player") {
    const clean = String(body.name || "").trim().slice(0, 80);
    if (!clean) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    const { data, error } = await supabase.from("players").insert({ name: clean, active: true }).select("id").single();
    if (error) return NextResponse.json({ error: error.code === "23505" ? "This name already exists." : error.message }, { status: 400 });
    return NextResponse.json({ ok: true, id: data?.id });
  }

  // Spieler löschen
  if (body.action === "delete_player") {
    if (!body.id) return NextResponse.json({ error: "Player ID required." }, { status: 400 });
    const { error } = await supabase.from("players").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // Event hinzufügen oder aktualisieren
  if (body.action === "add_event" || body.action === "update_event") {
    if (!body.starts_at) {
      return NextResponse.json({ error: "Start date/time is required." }, { status: 400 });
    }

    const startsAtIso = new Date(body.starts_at).toISOString();
    const endsAtIso = body.ends_at ? new Date(body.ends_at).toISOString() : null;

    const payload = {
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      location: String(body.location || "").slice(0, 150),
      notes: String(body.notes || "").slice(0, 300),
      active: true
    };

    const query = body.action === "add_event"
      ? supabase.from("events").insert(payload)
      : supabase.from("events").update(payload).eq("id", body.id);

    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // Event löschen
  if (body.action === "delete_event") {
    const { error } = await supabase.from("events").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}