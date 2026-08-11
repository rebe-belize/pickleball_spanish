"use client";

import { useState, useEffect } from "react";

interface Player { id: string; name: string; active: boolean; }
interface EventItem { id: string; starts_at: string; ends_at: string | null; location: string; notes: string; active: boolean; }

// Hilfsfunktion zur Formatierung von Date-Strings für datetime-local Inputs (YYYY-MM-THH:mm)
function formatToDatetimeLocal(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function AdminApp() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  const [playerName, setPlayerName] = useState("");

  // Event Form State
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventEndsAt, setEventEndsAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [eventActive, setEventActive] = useState(true);

  const resetEventForm = () => {
    setEditingEventId(null);
    setEventStartsAt("");
    setEventEndsAt("");
    setEventLocation("");
    setEventNotes("");
    setEventActive(true);
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin");
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.players || []);
        setEvents(data.events || []);
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    } catch {
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", password }),
      });
      const data = await res.json();
      if (res.ok) {
        setPassword("");
        setIsLoggedIn(true);
        fetchData();
      } else {
        setError(data.error || "Login failed.");
      }
    } catch {
      setError("An error occurred.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setIsLoggedIn(false);
    setPlayers([]);
    setEvents([]);
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_player", name: playerName }),
    });
    if (res.ok) {
      setPlayerName("");
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || "Error adding player.");
    }
  };

  const handleDeletePlayer = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete player "${name}"?`)) return;
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_player", id }),
    });
    if (res.ok) {
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || "Error deleting player.");
    }
  };

  // Event Erstellen oder Aktualisieren
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventStartsAt) return;

    const startsAtIso = new Date(eventStartsAt).toISOString();
    const endsAtIso = eventEndsAt ? new Date(eventEndsAt).toISOString() : null;

    const action = editingEventId ? "update_event" : "add_event";
    const payload = {
      action,
      ...(editingEventId ? { id: editingEventId } : {}),
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      location: eventLocation,
      notes: eventNotes,
      active: eventActive,
    };

    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      resetEventForm();
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || `Error ${editingEventId ? "updating" : "adding"} event.`);
    }
  };

  const handleEditClick = (ev: EventItem) => {
    setEditingEventId(ev.id);
    setEventStartsAt(formatToDatetimeLocal(ev.starts_at));
    setEventEndsAt(ev.ends_at ? formatToDatetimeLocal(ev.ends_at) : "");
    setEventLocation(ev.location || "");
    setEventNotes(ev.notes || "");
    setEventActive(ev.active ?? true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_event", id }),
    });
    if (res.ok) {
      if (editingEventId === id) resetEventForm();
      fetchData();
    } else {
      alert("Error deleting event.");
    }
  };

  if (loading) return <main className="page"><div className="container">Loading...</div></main>;

  if (!isLoggedIn) {
    return (
      <main className="page">
        <div className="container" style={{ maxWidth: "400px", marginTop: "4rem" }}>
          <form onSubmit={handleLogin} className="card">
            <h1 className="card-title" style={{ textAlign: "center" }}>Admin Login</h1>
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Login
            </button>
            {error && <p className="error" style={{ marginTop: "1rem", textAlign: "center" }}>{error}</p>}
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <header className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="brand">
            <h1>Admin Panel</h1>
            <p>Manage Players and Events</p>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <a className="admin-link" href="/">← Back to App</a>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem" }}>
              Logout
            </button>
          </div>
        </header>

        {/* Players Section */}
        <section className="card">
          <h2 className="card-title">Manage Players</h2>
          <form onSubmit={handleAddPlayer} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="New player name"
            />
            <button type="submit" className="btn btn-primary">Add</button>
          </form>

          <div className="players">
            {players.map((p) => (
              <span key={p.id} className="player-chip" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                {p.name}
                <button
                  type="button"
                  onClick={() => handleDeletePlayer(p.id, p.name)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--danger)",
                    cursor: "pointer",
                    padding: "0 2px",
                    fontWeight: "bold",
                    fontSize: "0.9rem"
                  }}
                  title="Delete player"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </section>

        {/* Create / Edit Event Section */}
        <section className="card">
          <h2 className="card-title">
            {editingEventId ? "Edit Event" : "Create New Event"}
          </h2>
          <form onSubmit={handleSaveEvent} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="datetime-local"
                  value={eventStartsAt}
                  onChange={(e) => setEventStartsAt(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={eventEndsAt}
                  onChange={(e) => setEventEndsAt(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="e.g. Court 1"
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={eventNotes}
                onChange={(e) => setEventNotes(e.target.value)}
                placeholder="e.g. Bring extra balls"
              />
            </div>

            {editingEventId && (
              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="eventActive"
                  checked={eventActive}
                  onChange={(e) => setEventActive(e.target.checked)}
                />
                <label htmlFor="eventActive" style={{ margin: 0 }}>Active Event</label>
              </div>
            )}

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" className="btn btn-primary">
                {editingEventId ? "Update Event" : "Save Event"}
              </button>
              {editingEventId && (
                <button type="button" onClick={resetEventForm} className="btn btn-secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Events List */}
        <section className="card">
          <h2 className="card-title">Existing Events ({events.length})</h2>
          {events.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No events created yet.</p>
          ) : (
            <div>
              {events.map((ev) => (
                <div key={ev.id} className="list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {new Date(ev.starts_at).toLocaleString()}
                      {ev.ends_at && ` - ${new Date(ev.ends_at).toLocaleTimeString()}`}
                      {!ev.active && <span style={{ marginLeft: "0.5rem", color: "var(--danger)", fontSize: "0.8rem" }}>(Inactive)</span>}
                    </div>
                    {ev.location && <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>📍 {ev.location}</div>}
                    {ev.notes && <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>📝 {ev.notes}</div>}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => handleEditClick(ev)} className="btn btn-secondary">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteEvent(ev.id)} className="btn btn-danger">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}