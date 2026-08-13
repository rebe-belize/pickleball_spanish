"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import MiniWeatherWidget from "./components/MiniWeatherWidget";

type Player = { id: string; name: string };
type Event = { id: string; starts_at: string; ends_at: string | null; location: string | null; notes: string | null };
type Response = {
  id: string;
  event_id: string;
  player_id: string;
  comment: string | null;
  guests_count?: number;
  players?: { id: string; name: string } | { id: string; name: string }[]
};

function responsePlayer(r: Response) {
  return Array.isArray(r.players) ? r.players[0] : r.players;
}

function getGuestsFromResponse(r: Response): number {
  if (r.guests_count !== undefined) return r.guests_count;
  if (!r.comment) return 0;

  const match = r.comment.match(/\+(\d+)|(\d+)\s*(gast|gäste|guest)/i);
  return match ? parseInt(match[1] || match[2], 10) : 0;
}

// Wandelt 24h String ("18:30") in 12h AM/PM String ("6:30 PM") um
function formatTime12h(time24: string): string {
  if (!time24) return "";
  const [hoursStr, minutesStr] = time24.split(":");
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr || "00";
  if (isNaN(hours)) return time24;

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // '0' Uhr wird zu '12'
  return `${hours}:${minutes} ${ampm}`;
}

// Wandelt ggf. 12h String ("6:30 PM") zurück in 24h String ("18:30") für das input field
function convertTo24h(timeStr: string): string {
  if (!timeStr) return "";
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return timeStr;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3]?.toUpperCase();

  if (ampm) {
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function parseCommentData(commentStr: string | null) {
  if (!commentStr) return { guests: 0, arrival: "", freeText: "" };

  const parts = commentStr.split(" | ").map(p => p.trim());
  let guests = 0;
  let arrival = "";
  const freeParts: string[] = [];

  parts.forEach(part => {
    const guestMatch = part.match(/\+(\d+)\s*Guest/i);
    // Unterstützt jetzt 24h (18:30) und 12h (6:30 PM) beim Parsen
    const arrivalMatch = part.match(/⏰ Arrival:\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);

    if (guestMatch) {
      guests = parseInt(guestMatch[1], 10);
    } else if (arrivalMatch) {
      arrival = convertTo24h(arrivalMatch[1]);
    } else {
      freeParts.push(part);
    }
  });

  return {
    guests,
    arrival,
    freeText: freeParts.join(" | ")
  };
}

// Formatiert den gespeicherten Kommentar für die Anzeige in schönes 12h-Format
function displayCommentText(commentStr: string | null): string {
  if (!commentStr) return "";
  return commentStr.replace(/⏰ Arrival:\s*(\d{2}:\d{2})/g, (_, time) => {
    return `⏰ Arrival: ${formatTime12h(time)}`;
  });
}

function status(count: number) {
  if (count >= 4) return { cls: "green", text: `${count} Players – Game on!` };
  if (count >= 2) return { cls: "orange", text: `${count} Players – Almost enough` };
  return { cls: "gray", text: `${count} Players – Open` };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function PlayerApp({
  initialPlayers, initialEvents, initialResponses
}: {
  initialPlayers: Player[]; initialEvents: Event[]; initialResponses: Response[];
}) {
  const [players, setPlayers] = useState(initialPlayers);
  const [responses, setResponses] = useState(initialResponses);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [arrivalTimes, setArrivalTimes] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [guests, setGuests] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [showAddPlayerForEvent, setShowAddPlayerForEvent] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");

  const [darkMode, setDarkMode] = useState<boolean | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    const isDark = savedTheme === "dark" || (!savedTheme && systemPrefersDark);
    setDarkMode(isDark);

    if (isDark) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const nextState = !darkMode;
    setDarkMode(nextState);

    if (nextState) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleSelectPlayerFromChip = (eventId: string, response: Response) => {
    const playerId = response.player_id;
    const parsed = parseCommentData(response.comment);

    setSelected(prev => ({ ...prev, [eventId]: playerId }));
    setGuests(prev => ({ ...prev, [eventId]: parsed.guests }));
    setArrivalTimes(prev => ({ ...prev, [eventId]: parsed.arrival }));
    setComments(prev => ({ ...prev, [eventId]: parsed.freeText }));
  };

  function buildCommentText(eventId: string): string {
    const guestCount = guests[eventId] || 0;
    const arrival = arrivalTimes[eventId]?.trim();
    const freeText = comments[eventId]?.trim();

    const parts: string[] = [];

    if (guestCount > 0) {
      parts.push(`+${guestCount} Guest(s)`);
    }
    if (arrival) {
      // Speichert standardisiertes 24h Format intern (z. B. "18:30")
      parts.push(`⏰ Arrival: ${arrival}`);
    }
    if (freeText) {
      parts.push(freeText);
    }

    return parts.join(" | ");
  }

  async function handleResponse(eventId: string, playerId: string, forceRemove = false, responseIdTarget?: string) {
    if (!playerId && !responseIdTarget) {
      setMessage("Please select your name first.");
      return;
    }

    const existing = responses.find(r =>
      responseIdTarget ? r.id === responseIdTarget : (r.event_id === eventId && r.player_id === playerId)
    );
    const shouldRemove = forceRemove || !!existing;

    if (shouldRemove) {
      const confirmed = window.confirm("Are you sure you want to cancel your attendance for this game?");
      if (!confirmed) return;
    }

    setBusy(eventId);
    setMessage("");

    const commentText = buildCommentText(eventId);
    const targetPlayerId = playerId || existing?.player_id;

    const res = await fetch("/api/responses", {
      method: shouldRemove ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shouldRemove
        ? { event_id: eventId, player_id: targetPlayerId, id: existing?.id }
        : { event_id: eventId, player_id: targetPlayerId, comment: commentText })
    });

    const data = await res.json();
    setBusy(null);

    if (!res.ok) {
      setMessage(data.error || "Something went wrong.");
      return;
    }

    if (shouldRemove) {
      setResponses(prev => prev.filter(r => r.id !== (existing?.id || data.id)));
      setSelected(prev => ({ ...prev, [eventId]: "" }));
      setGuests(prev => ({ ...prev, [eventId]: 0 }));
      setArrivalTimes(prev => ({ ...prev, [eventId]: "" }));
      setComments(prev => ({ ...prev, [eventId]: "" }));
    } else {
      setResponses(prev => [...prev.filter(r => !(r.event_id === eventId && r.player_id === targetPlayerId)), data.response]);
    }
  }

  async function handleCreatePlayer(e: React.FormEvent, eventId: string) {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_player", name: newPlayerName.trim() })
    });

    const data = await res.json();
    if (res.ok) {
      const createdId = data.id || Date.now().toString();
      const newPlayerObj = { id: createdId, name: newPlayerName.trim() };

      setPlayers(prev => [...prev, newPlayerObj].sort((a, b) => a.name.localeCompare(b.name)));
      setSelected(prev => ({ ...prev, [eventId]: createdId }));

      setNewPlayerName("");
      setShowAddPlayerForEvent(null);
      setMessage("Name added! It has been selected for you.");
    } else {
      setMessage(data.error || "Could not add name.");
    }
  }

  async function saveComment(eventId: string) {
    const playerId = selected[eventId];
    if (!playerId) {
      setMessage("Please select your name first.");
      return;
    }
    const existing = responses.find(r => r.event_id === eventId && r.player_id === playerId);
    if (!existing) {
      setMessage("Please sign up first before updating your details.");
      return;
    }

    setBusy(eventId);
    const commentText = buildCommentText(eventId);

    const res = await fetch("/api/responses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: existing.id, comment: commentText })
    });
    const data = await res.json();
    setBusy(null);

    if (!res.ok) {
      setMessage(data.error || "Details could not be saved.");
      return;
    }
    setResponses(prev => prev.map(r => r.id === existing.id ? data.response : r));
  }

  return (
    <main className="page">
      <div className="container">
        <header className="header">
          <div className="brand" style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <Image
              src="/logo.png"
              alt="Pickleball Logo"
              width={48}
              height={48}
              style={{ borderRadius: "50%", objectFit: "cover" }}
              priority
            />
            <div>
              <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Pickleball Spanish Lookout</h1>
              <p style={{ margin: 0 }}>Game Schedule & Registrations</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              type="button"
              onClick={toggleDarkMode}
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.75rem", fontSize: "1.1rem" }}
              title="Toggle Dark/Light Mode"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
            <a className="admin-link" href="/admin">Admin Panel</a>
          </div>
        </header>

        {message && <div className="notice">{message}</div>}

        {initialEvents.length === 0 && (
          <div className="card">There are currently no upcoming games scheduled.</div>
        )}

        {initialEvents.map(event => {
          const eventResponses = responses.filter(r => r.event_id === event.id);

          const totalGuests = eventResponses.reduce((sum, r) => sum + getGuestsFromResponse(r), 0);
          const totalCount = eventResponses.length + totalGuests;

          const s = status(totalCount);
          const selectedPlayer = selected[event.id];
          const alreadyIn = eventResponses.some(r => r.player_id === selectedPlayer);
          const isAddingPlayer = showAddPlayerForEvent === event.id;
          const nextUpcomingEventId = initialEvents.find(ev => new Date(ev.starts_at) > new Date())?.id;
          const isNextEvent = event.id === nextUpcomingEventId;
          const rawLocation = event.location?.trim() || "Spanish Lookout";

          return (
            <section className="card" key={event.id}>
              {/* 1. Zeile: Datum links & Status-Badge ("0 Players") rechts */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="event-date">{formatDate(event.starts_at)}</div>
                <div className={`status ${s.cls}`}>{s.text}</div>
              </div>

              {/* 2. Zeile: Uhrzeit */}
              <div className="event-time" style={{ marginTop: "0.25rem" }}>
                ⏰ {formatTime(event.starts_at)}
                {event.ends_at ? ` – ${formatTime(event.ends_at)}` : ""}
              </div>

              {/* 3. Zeile: Ort (Spalte 1) & Forecast (Spalte 2) über die VOLLE Kartenbreite */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr", // Exakt wie das Formular unten
                  gap: "1rem",                   // Gleicher Gap wie beim Formular
                  alignItems: "baseline",
                  marginTop: "0.5rem",
                  width: "100%"
                }}
              >
                {/* Spalte 1: Bündig mit "WHO ARE YOU?" */}
                <div className="location" style={{ margin: 0, fontSize: "0.9rem" }}>
                  📍 {rawLocation}
                </div>

                {/* Spalte 2: Beginnt HAARGENAU auf Höhe von "BRINGING GUESTS?" */}
                {isNextEvent && (
                  <div>
                    <MiniWeatherWidget
                      eventTime={event.starts_at}
                      location={rawLocation}
                    />
                  </div>
                )}
              </div>

              {event.notes && <div className="location" style={{ marginTop: "0.25rem" }}>📝 {event.notes}</div>}

              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid var(--border-color, rgba(125, 125, 125, 0.2))",
                  margin: "1rem 0"
                }}
              />
              
              {/* Spieler-Chips */}
              <div className="players">
                {eventResponses.map(r => {
                  const p = responsePlayer(r);
                  const guestCount = getGuestsFromResponse(r);
                  return (
                    <div
                      className="player-chip"
                      key={r.id}
                      onClick={() => handleSelectPlayerFromChip(event.id, r)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        cursor: "pointer"
                      }}
                      title="Click to edit details for this player"
                    >
                      <span>✓ {p?.name} {guestCount > 0 ? `(+${guestCount} Guest${guestCount > 1 ? 's' : ''})` : ''}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResponse(event.id, r.player_id, true, r.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--danger)",
                          cursor: "pointer",
                          fontWeight: "bold",
                          padding: "0 2px"
                        }}
                        title="Remove registration"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
                {eventResponses.length === 0 && (
                  <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Nobody registered yet.</span>
                )}
              </div>

              {/* Formular-Zeile */}
              <div className="form-row">
                {/* Wer bist du */}
                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label>Who are you?</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (isAddingPlayer) {
                          setShowAddPlayerForEvent(null);
                        } else {
                          setShowAddPlayerForEvent(event.id);
                          setNewPlayerName("");
                        }
                      }}
                      style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
                    >
                      {isAddingPlayer ? "Cancel" : "+ Not in list?"}
                    </button>
                  </div>

                  {!isAddingPlayer ? (
                    <select
                      value={selectedPlayer || ""}
                      onChange={e => {
                        const pid = e.target.value;
                        setSelected(prev => ({ ...prev, [event.id]: pid }));

                        const existingResponse = eventResponses.find(r => r.player_id === pid);
                        if (existingResponse) {
                          handleSelectPlayerFromChip(event.id, existingResponse);
                        } else {
                          setGuests(prev => ({ ...prev, [event.id]: 0 }));
                          setArrivalTimes(prev => ({ ...prev, [event.id]: "" }));
                          setComments(prev => ({ ...prev, [event.id]: "" }));
                        }
                      }}
                    >
                      <option value="">Select your name…</option>
                      {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  ) : (
                    <form onSubmit={(e) => handleCreatePlayer(e, event.id)} style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="text"
                        value={newPlayerName}
                        onChange={e => setNewPlayerName(e.target.value)}
                        placeholder="Enter your name"
                        autoFocus
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: "0.4rem 0.8rem" }}>Save</button>
                    </form>
                  )}
                </div>

                {/* Gäste */}
                <div className="form-group">
                  <label>Bringing Guests?</label>
                  <select
                    value={guests[event.id] || 0}
                    onChange={e => setGuests(prev => ({ ...prev, [event.id]: parseInt(e.target.value, 10) }))}
                  >
                    <option value={0}>0 Guests</option>
                    <option value={1}>+1 Guest</option>
                    <option value={2}>+2 Guests</option>
                    <option value={3}>+3 Guests</option>
                  </select>
                </div>

                {/* Optionale Ankunftszeit */}
                <div className="form-group">
                  <label>Arrival Time (optional)</label>
                  <input
                    type="time"
                    value={arrivalTimes[event.id] || ""}
                    onChange={e => setArrivalTimes(prev => ({ ...prev, [event.id]: e.target.value }))}
                  />
                </div>

                {/* Kommentar */}
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Comment (optional)</label>
                  <input
                    value={comments[event.id] || ""}
                    onChange={e => setComments(prev => ({ ...prev, [event.id]: e.target.value }))}
                    placeholder="e.g. need to leave early"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="actions">
                {!alreadyIn ? (
                  <button
                    className="btn btn-primary"
                    disabled={busy === event.id}
                    onClick={() => handleResponse(event.id, selectedPlayer)}
                  >
                    {busy === event.id ? "Saving…" : "I'm In"}
                  </button>
                ) : (
                  <>
                    <button
                      className="btn btn-danger"
                      disabled={busy === event.id}
                      onClick={() => handleResponse(event.id, selectedPlayer, true)}
                    >
                      {busy === event.id ? "Updating…" : "Cancel Attendance"}
                    </button>
                    <button
                      className="btn btn-secondary"
                      disabled={busy === event.id}
                      onClick={() => saveComment(event.id)}
                    >
                      Update Details
                    </button>
                  </>
                )}
              </div>

              {/* Kommentare & Ankunftszeiten anzeigen (formatiert als 12h AM/PM) */}
              {
                eventResponses.some(r => r.comment) && (
                  <div className="comment-list">
                    <strong style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>PLAYER NOTES & ARRIVAL TIMES</strong>
                    {eventResponses.filter(r => r.comment).map(r => (
                      <div className="comment" key={r.id}>
                        <div className="comment-name">{responsePlayer(r)?.name}</div>
                        <div className="comment-text">{displayCommentText(r.comment)}</div>
                      </div>
                    ))}
                  </div>
                )
              }
            </section>
          );
        })}
      </div>
    </main >
  );
}