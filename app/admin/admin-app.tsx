"use client";

import { useState, useEffect } from "react";

interface Player { id: string; name: string; active: boolean; }
interface EventItem { id: string; starts_at: string; ends_at: string | null; location: string; notes: string; active: boolean; }

export default function AdminApp() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  const [playerName, setPlayerName] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventEndsAt, setEventEndsAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventNotes, setEventNotes] = useState("");

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

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventStartsAt) return;
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_event",
        starts_at: eventStartsAt,
        ends_at: eventEndsAt || null,
        location: eventLocation,
        notes: eventNotes,
      }),
    });
    if (res.ok) {
      setEventStartsAt("");
      setEventEndsAt("");
      setEventLocation("");
      setEventNotes("");
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || "Error adding event.");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_event", id }),
    });
    if (res.ok) fetchData();
    else alert("Error deleting event.");
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
        <header className="header">
          <div className="brand">
            <h1>Admin Panel</h1>
            <p>Manage Players and Events</p>
          </div>
          <a className="admin-link" href="/">← Back to App</a>
        </header>

        {/* Players Section */}
        <section className="card">
          <h2 className="card-title">Manage Players</h2>
          <form onSubmit={handleAddPlayer} style={{ display: "flex", gap: "0.5rem" }}>
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
              <span key={p.id} className="player-chip">{p.name}</span>
            ))}
          </div>
        </section>

        {/* Create Event Section */}
        <section className="card">
          <h2 className="card-title">Create New Event</h2>
          <form onSubmit={handleAddEvent} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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

            <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
              Save Event
            </button>
          </form>
        </section>

        {/* Events List */}
        <section className="card">
          <h2 className="card-title">Existing Events</h2>
          {events.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No events created yet.</p>
          ) : (
            <div>
              {events.map((ev) => (
                <div key={ev.id} className="list-item">
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {new Date(ev.starts_at).toLocaleString()}
                      {ev.ends_at && ` - ${new Date(ev.ends_at).toLocaleTimeString()}`}
                    </div>
                    {ev.location && <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>📍 {ev.location}</div>}
                  </div>
                  <button onClick={() => handleDeleteEvent(ev.id)} className="btn btn-danger">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}