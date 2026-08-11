import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event_id, player_id, comment = "" } = body;

    if (!event_id || !player_id) {
      return NextResponse.json(
        { error: "Event and player are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("responses")
      .upsert(
        { event_id, player_id, comment: String(comment).slice(0, 300) },
        { onConflict: "event_id,player_id" }
      )
      .select("id,event_id,player_id,comment,players(id,name)")
      .single();

    if (error) throw error;
    return NextResponse.json({ response: data });
  } catch {
    return NextResponse.json(
      { error: "Could not save attendance response." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json(
        { error: "Response ID is missing." },
        { status: 400 }
      );
    }

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
    return NextResponse.json(
      { error: "Could not save comment." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    console.log("RECEIVED DELETE BODY:", body);
    const { id, event_id, player_id } = body;

    const supabase = getSupabase();
    let query = supabase.from("responses").delete();

    // Priority 1: Delete via unique Response ID
    if (id) {
      query = query.eq("id", id);
    } 
    // Priority 2: Delete via combined event_id AND player_id
    else if (event_id && player_id) {
      query = query.eq("event_id", event_id).eq("player_id", player_id);
    } else {
      return NextResponse.json(
        { error: "Missing parameters for deletion (id or event_id + player_id required)." },
        { status: 400 }
      );
    }

    const { error, count } = await query;

    if (error) {
      console.error("Supabase DELETE Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`Successfully deleted. Affected rows: ${count}`);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API DELETE Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}