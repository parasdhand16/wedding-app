"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";

const EVENTS = ["Wedding", "Engagement", "Moga", "Path"];
const EVENT_COLORS = { Wedding: "#6b8f71", Engagement: "#c4917b", Moga: "#8b7355", Path: "#7b8fa6" };

const DEFAULT_MEMBERS = [
  "Paras", "Member 2", "Member 3", "Member 4", "Member 5",
  "Member 6", "Member 7", "Member 8", "Member 9", "Member 10",
];

function memberRowToMember(row) {
  return {
    id: row.id,
    name: row.name,
    guests: [],
  };
}

function guestRowToGuest(row) {
  return {
    id: row.id,
    name: row.guest_name || "",
    adults: row.adults ?? 1,
    children: row.children ?? 0,
    events: {
      Wedding: !!row.wedding,
      Engagement: !!row.engagement,
      Moga: !!row.moga,
      Path: !!row.path,
    },
    dupAcknowledged: !!row.dup_acknowledged,
  };
}

function guestToRow(member, guest) {
  return {
    id: guest.id,
    family_member_id: member.id,
    family_member: member.name,
    guest_name: guest.name,
    adults: guest.adults,
    children: guest.children,
    wedding: guest.events.Wedding,
    engagement: guest.events.Engagement,
    moga: guest.events.Moga,
    path: guest.events.Path,
    dup_acknowledged: guest.dupAcknowledged,
  };
}

function createEmptyData() {
  return DEFAULT_MEMBERS.map((name, i) => ({ id: `m${i}`, name, guests: [] }));
}

function newGuest() {
  return {
    id: `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: "", adults: 1, children: 0,
    events: { Wedding: false, Engagement: false, Moga: false, Path: false },
    dupAcknowledged: false,
  };
}

/* ── Donut ── */
function Donut({ value, total, size = 110, strokeW = 12, colors, label, centerLabel }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const r = (size - strokeW) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colors.track} strokeWidth={strokeW} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colors.fill} strokeWidth={strokeW}
          strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={c * 0.25} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s cubic-bezier(.4,0,.2,1)" }} />
        <text x={size/2} y={centerLabel ? size/2 - 5 : size/2} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: size * 0.24, fontWeight: 700, fill: colors.text, fontFamily: "'Playfair Display',serif" }}>
          {value}
        </text>
        {centerLabel && (
          <text x={size/2} y={size/2 + 12} textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: 8, fill: "#a09585", fontFamily: "'DM Sans',sans-serif", letterSpacing: 1.5, textTransform: "uppercase" }}>
            {centerLabel}
          </text>
        )}
      </svg>
      {label && <span style={{ fontSize: 10, color: "#a09585", letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>{label}</span>}
    </div>
  );
}

/* ── Mini Bar ── */
function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
      <span style={{ width: 85, fontSize: 11, color: "#6b5e50", textAlign: "right", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <div style={{ flex: 1, height: 16, background: "#f0ebe4", borderRadius: 8, overflow: "hidden", minWidth: 60 }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: color, borderRadius: 8,
          transition: "width 0.4s cubic-bezier(.4,0,.2,1)",
          display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: value > 0 ? 6 : 0, minWidth: value > 0 ? 20 : 0,
        }}>
          {value > 0 && <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>{value}</span>}
        </div>
      </div>
    </div>
  );
}

/* ── Duplicate Warning Banner ── */
function DupWarning({ guestName, existingMember, onKeep, onRemove }) {
  return (
    <div style={{
      background: "#fef3e2", border: "1px solid #f0c96b", borderRadius: 10, padding: "10px 14px",
      margin: "0 0 2px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      animation: "fadeSlide 0.3s ease",
    }}>
      <span style={{ fontSize: 18 }}>⚠️</span>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#8a6d20" }}>
          Possible Duplicate
        </div>
        <div style={{ fontSize: 12, color: "#a68b3c", marginTop: 2 }}>
          <strong>"{guestName}"</strong> was already added by <strong>{existingMember}</strong>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onKeep} style={{
          background: "#8a6d20", color: "#fff", border: "none", borderRadius: 7,
          padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
        }}>Keep Anyway</button>
        <button onClick={onRemove} style={{
          background: "#fff", color: "#8a6d20", border: "1px solid #e0c460", borderRadius: 7,
          padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
        }}>Remove</button>
      </div>
    </div>
  );
}

/* ══════ MAIN ══════ */
export default function WeddingTracker() {
const [members, setMembers] = useState(null);
const [activeTab, setActiveTab] = useState("overview");
const [editingGuest, setEditingGuest] = useState(null);
const [editingMemberName, setEditingMemberName] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function loadData() {
    const { data: memberRows, error: memberError } = await supabase
      .from("family_members")
      .select("*")
      .order("display_order");

    const { data: guestRows, error: guestError } = await supabase
      .from("guests")
      .select("*");

    if (memberError || guestError) {
      console.error("Load failed", memberError || guestError);
      setMembers(createEmptyData());
      setLoading(false);
      return;
    }

    if (!memberRows || memberRows.length === 0) {
      const starterMembers = DEFAULT_MEMBERS.map((name, i) => ({
        id: `m${i}`,
        name,
        display_order: i,
      }));

      const { error: seedError } = await supabase
        .from("family_members")
        .insert(starterMembers);

      if (seedError) {
        console.error("Seeding family members failed", seedError);
        setMembers(createEmptyData());
        setLoading(false);
        return;
      }

      setMembers(createEmptyData());
      setLoading(false);
      return;
    }

    const membersMap = {};

    memberRows.forEach((m) => {
      membersMap[m.id] = {
        ...memberRowToMember(m),
        guests: [],
      };
    });

    guestRows?.forEach((g) => {
      const member = membersMap[g.family_member_id];
      if (member) {
        member.guests.push(guestRowToGuest(g));
      }
    });

    setMembers(Object.values(membersMap));
    setLoading(false);
  }

  loadData();
}, []);

  const updateMember = useCallback((mid, fn) => {
  setMembers((prev) => prev.map((m) => (m.id === mid ? fn(m) : m)));
}, []);

const addGuest = async (mid) => {
  try {
    console.log("Adding guest for:", mid);

    const addGuest = async (mid) => {
  try {
    console.log("Adding guest for:", mid);

    const member = members.find((m) => m.id === mid);
    if (!member) {
      alert("Member not found");
      return;
    }

    const g = newGuest();
    console.log("New guest object:", g);

    const row = guestToRow(member, g);
    console.log("Row to insert:", row);

    const { data, error } = await supabase.from("guests").insert([row]);

    console.log("Supabase response:", { data, error });

    if (error) {
      alert("ERROR: " + error.message);
      return;
    }

    updateMember(mid, (m) => ({ ...m, guests: [...m.guests, g] }));
    setEditingGuest(g.id);
  } catch (err) {
    console.error(err);
    alert("CRASH: " + err.message);
  }
};
  const findDuplicate = useCallback((guestName, guestId, currentMemberId) => {
  if (!guestName || !guestName.trim() || !members) return null;
  const norm = guestName.trim().toLowerCase();

  for (const m of members) {
    if (m.id === currentMemberId) continue;
    for (const g of m.guests) {
      if (g.id === guestId) continue;
      if (g.name.trim().toLowerCase() === norm) {
        return { memberName: m.name, guestId: g.id };
      }
    }
  }

  const sameMember = members.find((m) => m.id === currentMemberId);
  if (sameMember) {
    for (const g of sameMember.guests) {
      if (g.id === guestId) continue;
      if (g.name.trim().toLowerCase() === norm) {
        return { memberName: sameMember.name + " (same list)", guestId: g.id };
      }
    }
  }

  return null;
}, [members]);
    updateMember(mid, (m) => ({ ...m, guests: [...m.guests, g] }));
    setEditingGuest(g.id);

  } catch (err) {
    console.error(err);
    alert("CRASH: " + err.message);
  }
};
  updateMember(mid, (m) => ({ ...m, guests: [...m.guests, g] }));
  setEditingGuest(g.id);
};

const removeGuest = async (mid, gid) => {
  const { error } = await supabase.from("guests").delete().eq("id", gid);
  if (error) {
    console.error("Remove guest failed", error);
    return;
  }

  updateMember(mid, (m) => ({
    ...m,
    guests: m.guests.filter((g) => g.id !== gid),
  }));

  if (editingGuest === gid) setEditingGuest(null);
};

const updGuest = async (mid, gid, field, val) => {
  const member = members.find((m) => m.id === mid);
  if (!member) return;

  const guest = member.guests.find((g) => g.id === gid);
  if (!guest) return;

  const updatedGuest = {
    ...guest,
    [field]: val,
    ...(field === "name" ? { dupAcknowledged: false } : {}),
  };

  const row = guestToRow(member, updatedGuest);

  const { error } = await supabase
    .from("guests")
    .update(row)
    .eq("id", gid);

  if (error) {
    console.error("Update guest failed", error);
    return;
  }

  updateMember(mid, (m) => ({
    ...m,
    guests: m.guests.map((g) => (g.id === gid ? updatedGuest : g)),
  }));
};

const acknowledgeDup = async (mid, gid) => {
  const { error } = await supabase
    .from("guests")
    .update({ dup_acknowledged: true })
    .eq("id", gid);

  if (error) {
    console.error("Acknowledge duplicate failed", error);
    return;
  }

  updateMember(mid, (m) => ({
    ...m,
    guests: m.guests.map((g) =>
      g.id === gid ? { ...g, dupAcknowledged: true } : g
    ),
  }));
};

const toggleEv = async (mid, gid, ev) => {
  const member = members.find((m) => m.id === mid);
  if (!member) return;

  const guest = member.guests.find((g) => g.id === gid);
  if (!guest) return;

  const updatedGuest = {
    ...guest,
    events: {
      ...guest.events,
      [ev]: !guest.events[ev],
    },
  };

  const row = guestToRow(member, updatedGuest);

  const { error } = await supabase
    .from("guests")
    .update(row)
    .eq("id", gid);

  if (error) {
    console.error("Toggle event failed", error);
    return;
  }

  updateMember(mid, (m) => ({
    ...m,
    guests: m.guests.map((g) => (g.id === gid ? updatedGuest : g)),
  }));
};
  if (loading || !members) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "'DM Sans',sans-serif", color: "#a09585" }}>Loading...</div>
  );

  const allGuests = members.flatMap(m => m.guests.map(g => ({ ...g, memberId: m.id })));
  const totalByEvent = EVENTS.map(ev => ({
    event: ev,
    adults: allGuests.filter(g => g.events[ev]).reduce((s, g) => s + g.adults, 0),
    children: allGuests.filter(g => g.events[ev]).reduce((s, g) => s + g.children, 0),
  }));
  const totalAdults = allGuests.reduce((s, g) => s + g.adults, 0);
  const totalChildren = allGuests.reduce((s, g) => s + g.children, 0);
  const totalPeople = totalAdults + totalChildren;
  const maxEvPeople = Math.max(...totalByEvent.map(e => e.adults + e.children), 1);

  // Count total duplicates across all
  const dupCount = (() => {
    const seen = new Map();
    let count = 0;
    for (const m of members) {
      for (const g of m.guests) {
        if (!g.name.trim()) continue;
        const norm = g.name.trim().toLowerCase();
        if (seen.has(norm) && !g.dupAcknowledged) count++;
        if (!seen.has(norm)) seen.set(norm, m.name);
      }
    }
    return count;
  })();

  const mStats = members.map(m => {
    const gs = m.guests;
    const adults = gs.reduce((s, g) => s + g.adults, 0);
    const children = gs.reduce((s, g) => s + g.children, 0);
    const byEv = EVENTS.map(ev => ({
      event: ev,
      people: gs.filter(g => g.events[ev]).reduce((s, g) => s + g.adults + g.children, 0),
    }));
    return { ...m, adults, children, total: adults + children, byEv };
  });
  const maxMT = Math.max(...mStats.map(m => m.total), 1);

  const resetData = async () => {
  if (!confirm("Clear ALL guest data?")) return;

  const { error } = await supabase.from("guests").delete().neq("id", "");

  if (error) {
    console.error("Reset failed", error);
    return;
  }

  setMembers((prev) =>
    prev.map((m) => ({
      ...m,
      guests: [],
    }))
  );
  setActiveTab("overview");
};

  const tabActive = (id) => activeTab === id;
  const tabBtn = (id, label, count) => (
    <button key={id} onClick={() => { setActiveTab(id); setEditingGuest(null); }} style={{
      padding: "7px 14px", borderRadius: 9, border: "none", cursor: "pointer",
      fontSize: 12, fontWeight: tabActive(id) ? 700 : 500, whiteSpace: "nowrap",
      fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
      background: tabActive(id) ? "#3d3428" : "transparent",
      color: tabActive(id) ? "#fff" : "#8a7d6b",
    }}>
      {label}
      {count > 0 && <span style={{
        marginLeft: 5, background: tabActive(id) ? "rgba(255,255,255,0.2)" : "#efe9e0",
        borderRadius: 8, padding: "1px 6px", fontSize: 10,
      }}>{count}</span>}
    </button>
  );

  const activeMember = members.find(m => m.id === activeTab);

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(160deg,#faf7f2 0%,#f3ece2 40%,#ede5d8 100%)",
      fontFamily: "'DM Sans',sans-serif", padding: "20px 10px 40px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes fadeSlide { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: "#b8a992", textTransform: "uppercase", marginBottom: 4 }}>Bride's Side</div>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700, color: "#3d3428", margin: 0 }}>
          Guest <span style={{ color: "#c4917b" }}>✦</span> List
        </h1>
        <div style={{ fontSize: 11, color: "#b8a992", marginTop: 3 }}>Wedding · Engagement · Moga · Path</div>
        <div style={{ width: 60, height: 2, background: "linear-gradient(90deg,transparent,#c4a97d,transparent)", margin: "6px auto 0" }} />
      </div>

      {/* Duplicate global alert */}
      {dupCount > 0 && (
        <div style={{
          maxWidth: 960, margin: "0 auto 12px", background: "#fef8ec", border: "1px solid #f0d878",
          borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8,
          animation: "fadeSlide 0.3s ease",
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ fontSize: 12, color: "#8a6d20", fontWeight: 500 }}>
            <strong>{dupCount}</strong> possible duplicate{dupCount > 1 ? "s" : ""} found across member lists — review flagged guests below
          </span>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        maxWidth: 960, margin: "0 auto 14px", display: "flex", gap: 5,
        overflowX: "auto", padding: "4px 0", WebkitOverflowScrolling: "touch",
      }}>
        {tabBtn("overview", "📊 Overview", 0)}
        {members.map(m => tabBtn(m.id, m.name, m.guests.length))}
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* ═══ OVERVIEW ═══ */}
        {activeTab === "overview" && (<>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 14 }}>
            {totalByEvent.map(ev => (
              <div key={ev.event} style={{
                background: "#fff", borderRadius: 14, padding: 14,
                boxShadow: "0 2px 14px rgba(139,115,85,0.07)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                borderTop: `3px solid ${EVENT_COLORS[ev.event]}`,
              }}>
                <Donut value={ev.adults + ev.children} total={maxEvPeople} size={94} strokeW={10}
                  colors={{ fill: EVENT_COLORS[ev.event], track: "#f0ebe4", text: "#3d3428" }} centerLabel="people" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#3d3428", fontFamily: "'Playfair Display',serif" }}>{ev.event}</span>
                <div style={{ display: "flex", gap: 8, fontSize: 10, color: "#a09585" }}>
                  <span>{ev.adults} adults</span><span>{ev.children} kids</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,1fr) 2fr", gap: 12, marginBottom: 14 }}>
            <div style={{
              background: "#fff", borderRadius: 14, padding: 18,
              boxShadow: "0 2px 14px rgba(139,115,85,0.07)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#b8a992", textTransform: "uppercase", fontWeight: 600 }}>Grand Total</div>
              <Donut value={totalAdults} total={totalPeople} size={120} strokeW={13}
                colors={{ fill: "#c4917b", track: "#e2d5c8", text: "#3d3428" }} centerLabel="people" />
              <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#c4917b", display: "inline-block" }} />
                  <span style={{ color: "#6b5e50" }}>Adults {totalAdults}</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e2d5c8", display: "inline-block" }} />
                  <span style={{ color: "#6b5e50" }}>Children {totalChildren}</span>
                </span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#3d3428", fontFamily: "'Playfair Display',serif" }}>{totalPeople}</div>
            </div>
            <div style={{
              background: "#fff", borderRadius: 14, padding: 18,
              boxShadow: "0 2px 14px rgba(139,115,85,0.07)",
            }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#b8a992", textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>Guests by Family Member</div>
              {mStats.map((m, i) => (
                <MiniBar key={m.id} label={m.name} value={m.total} max={maxMT}
                  color={i === 0 ? "#6b8f71" : `hsl(${20 + i * 12},${45 + i * 3}%,${55 + i * 2}%)`} />
              ))}
            </div>
          </div>

          <div style={{
            background: "#fff", borderRadius: 14, padding: 18,
            boxShadow: "0 2px 14px rgba(139,115,85,0.07)", marginBottom: 14, overflowX: "auto",
          }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#b8a992", textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>People per Member per Event</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #efe9e0" }}>
                  <th style={{ padding: "8px 8px", textAlign: "left", fontSize: 10, color: "#b8a992", letterSpacing: 1, textTransform: "uppercase" }}>Member</th>
                  {EVENTS.map(ev => (
                    <th key={ev} style={{ padding: "8px 8px", textAlign: "center", fontSize: 10, color: EVENT_COLORS[ev], letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>{ev}</th>
                  ))}
                  <th style={{ padding: "8px 8px", textAlign: "center", fontSize: 10, color: "#3d3428", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {mStats.map((m, i) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid #f5f0e8", background: i % 2 === 0 ? "#fff" : "#fdfcf9", cursor: "pointer" }}
                    onClick={() => setActiveTab(m.id)}>
                    <td style={{ padding: "7px 8px", fontWeight: 600, color: "#4a3f33" }}>{m.name}</td>
                    {m.byEv.map(e => (
                      <td key={e.event} style={{ padding: "7px 8px", textAlign: "center", color: e.people > 0 ? "#4a3f33" : "#d4cdc0", fontWeight: e.people > 0 ? 600 : 400 }}>
                        {e.people > 0 ? e.people : "—"}
                      </td>
                    ))}
                    <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: 700, color: "#3d3428", fontFamily: "'Playfair Display',serif", fontSize: 14 }}>{m.total}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid #e0d8cc", background: "#faf7f2" }}>
                  <td style={{ padding: "9px 8px", fontWeight: 700, color: "#3d3428" }}>TOTAL</td>
                  {totalByEvent.map(ev => (
                    <td key={ev.event} style={{ padding: "9px 8px", textAlign: "center", fontWeight: 700, color: EVENT_COLORS[ev.event], fontSize: 14 }}>
                      {ev.adults + ev.children}
                    </td>
                  ))}
                  <td style={{ padding: "9px 8px", textAlign: "center", fontWeight: 700, color: "#3d3428", fontFamily: "'Playfair Display',serif", fontSize: 16 }}>{totalPeople}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: "center" }}>
            <button onClick={resetData} style={{
              background: "none", border: "1px solid #e0d8cc", borderRadius: 8,
              padding: "5px 14px", fontSize: 11, color: "#b8a992", cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
            }}>Reset All Data</button>
          </div>
        </>)}

        {/* ═══ MEMBER TAB ═══ */}
        {activeMember && (() => {
          const ms = mStats.find(m => m.id === activeMember.id);
          return (<>
            <div style={{
              background: "#fff", borderRadius: 14, padding: 18,
              boxShadow: "0 2px 14px rgba(139,115,85,0.07)", marginBottom: 14,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  {editingMemberName === activeMember.id ? (
                    <input autoFocus value={activeMember.name}
                      onChange={async (e) => {
  const newName = e.target.value;

  updateMember(activeMember.id, (m) => ({ ...m, name: newName }));

  const { error } = await supabase
    .from("family_members")
    .update({ name: newName })
    .eq("id", activeMember.id);

  if (error) {
    console.error("Update member name failed", error);
  }
}}
                      onBlur={() => setEditingMemberName(null)}
                      onKeyDown={e => e.key === "Enter" && setEditingMemberName(null)}
                      style={{
                        fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700,
                        border: "1px solid #d9d1c3", borderRadius: 8, padding: "3px 10px",
                        color: "#3d3428", background: "#fdfcfa", outline: "none",
                      }} />
                  ) : (
                    <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#3d3428", margin: 0, cursor: "pointer" }}
                      onClick={() => setEditingMemberName(activeMember.id)}>
                      {activeMember.name}'s Guests <span style={{ fontSize: 12, color: "#c4b9a8" }}>✎</span>
                    </h2>
                  )}
                  <div style={{ fontSize: 11, color: "#a09585", marginTop: 2 }}>{activeMember.guests.length} guests · {ms.total} people ({ms.adults} adults, {ms.children} children)</div>
                </div>
                <button onClick={() => addGuest(activeMember.id)} style={{
                  background: "#6b8f71", color: "#fff", border: "none", borderRadius: 9,
                  padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                }}>+ Add Guest</button>
              </div>

              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: 8 }}>
                {ms.byEv.map(ev => (
                  <div key={ev.event} style={{
                    textAlign: "center", padding: "10px 6px", borderRadius: 10,
                    background: "#faf7f2", borderLeft: `3px solid ${EVENT_COLORS[ev.event]}`,
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: EVENT_COLORS[ev.event], fontFamily: "'Playfair Display',serif" }}>{ev.people}</div>
                    <div style={{ fontSize: 9, color: "#a09585", letterSpacing: 1, textTransform: "uppercase" }}>{ev.event}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Guest table */}
            <div style={{
              background: "#fff", borderRadius: 14,
              boxShadow: "0 2px 14px rgba(139,115,85,0.07)", overflow: "hidden",
            }}>
              {activeMember.guests.length === 0 ? (
                <div style={{ padding: 44, textAlign: "center", color: "#c4b9a8" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
                  No guests yet — click <strong>+ Add Guest</strong> to start
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#faf7f2" }}>
                        {["#", "Guest Name", "Adults", "Children", ...EVENTS, ""].map((h, i) => (
                          <th key={i} style={{
                            padding: "9px 8px", textAlign: i >= 4 && i < 8 ? "center" : "left",
                            fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase",
                            fontWeight: 600, whiteSpace: "nowrap", borderBottom: "2px solid #efe9e0",
                            color: EVENTS.includes(h) ? EVENT_COLORS[h] : "#b8a992",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeMember.guests.map((g, idx) => {
                        const isEd = editingGuest === g.id;
                        const dup = g.name.trim() ? findDuplicate(g.name, g.id, activeMember.id) : null;
                        const showDupWarning = dup && !g.dupAcknowledged;
                        const cs = { padding: "7px 8px", borderBottom: showDupWarning ? "none" : "1px solid #f5f0e8", color: "#4a3f33", whiteSpace: "nowrap" };
                        const inp = {
                          border: "1px solid #e0d8cc", borderRadius: 6, padding: "4px 7px",
                          fontSize: 13, fontFamily: "'DM Sans',sans-serif", color: "#3d3428",
                          background: "#fdfcfa", outline: "none",
                        };
                        return (
                          <React.Fragment key={g.id}>
                            <tr style={{
                              background: showDupWarning ? "#fefaf0" : isEd ? "#fefdf8" : idx % 2 === 0 ? "#fff" : "#fdfcf9",
                              borderLeft: showDupWarning ? "3px solid #f0c96b" : "3px solid transparent",
                            }}>
                              <td style={{ ...cs, color: "#c4b9a8", fontWeight: 600, width: 28 }}>{idx + 1}</td>
                              <td style={cs}>
                                {isEd ? (
                                  <input autoFocus style={{ ...inp, minWidth: 140, width: "100%" }} value={g.name} placeholder="Guest name"
                                    onChange={e => updGuest(activeMember.id, g.id, "name", e.target.value)} />
                                ) : (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    {showDupWarning && <span style={{ fontSize: 14 }} title="Duplicate detected">⚠️</span>}
                                    <span style={{ cursor: "pointer", fontWeight: 500 }} onClick={() => setEditingGuest(g.id)}>{g.name || "—"}</span>
                                  </div>
                                )}
                              </td>
                              <td style={cs}>
                                {isEd ? (
                                  <input type="number" min="0" style={{ ...inp, width: 50 }} value={g.adults}
                                    onChange={e => updGuest(activeMember.id, g.id, "adults", Math.max(0, parseInt(e.target.value) || 0))} />
                                ) : <span style={{ fontWeight: 600 }}>{g.adults}</span>}
                              </td>
                              <td style={cs}>
                                {isEd ? (
                                  <input type="number" min="0" style={{ ...inp, width: 50 }} value={g.children}
                                    onChange={e => updGuest(activeMember.id, g.id, "children", Math.max(0, parseInt(e.target.value) || 0))} />
                                ) : g.children}
                              </td>
                              {EVENTS.map(ev => (
                                <td key={ev} style={{ ...cs, textAlign: "center" }}>
                                  <input type="checkbox" checked={g.events[ev]}
                                    onChange={() => toggleEv(activeMember.id, g.id, ev)}
                                    style={{ width: 16, height: 16, accentColor: EVENT_COLORS[ev], cursor: "pointer" }} />
                                </td>
                              ))}
                              <td style={cs}>
                                <div style={{ display: "flex", gap: 3 }}>
                                  {isEd ? (
                                    <button onClick={() => setEditingGuest(null)} style={{
                                      background: "none", border: "1px solid #d9d1c3", borderRadius: 6,
                                      padding: "3px 9px", fontSize: 11, color: "#6b8f71", cursor: "pointer", fontWeight: 600,
                                    }}>Done</button>
                                  ) : (
                                    <button onClick={() => setEditingGuest(g.id)} style={{
                                      background: "none", border: "none", padding: "3px 5px",
                                      fontSize: 13, cursor: "pointer", color: "#c4b9a8",
                                    }}>✎</button>
                                  )}
                                  <button onClick={() => removeGuest(activeMember.id, g.id)} style={{
                                    background: "none", border: "none", padding: "3px 5px",
                                    fontSize: 15, cursor: "pointer", color: "#ddd3c4",
                                  }}
                                    onMouseEnter={e => e.currentTarget.style.color = "#c4917b"}
                                    onMouseLeave={e => e.currentTarget.style.color = "#ddd3c4"}
                                  >×</button>
                                </div>
                              </td>
                            </tr>
                            {/* Duplicate warning row */}
                            {showDupWarning && (
                              <tr>
                                <td colSpan={9} style={{ padding: "0 8px 8px", borderBottom: "1px solid #f5f0e8", background: "#fefaf0" }}>
                                  <DupWarning
                                    guestName={g.name}
                                    existingMember={dup.memberName}
                                    onKeep={() => acknowledgeDup(activeMember.id, g.id)}
                                    onRemove={() => removeGuest(activeMember.id, g.id)}
                                  />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>);
        })()}
      </div>

      <div style={{ textAlign: "center", marginTop: 18, fontSize: 10, color: "#c4b9a8", letterSpacing: 1 }}>
        Auto-saves · Click names to edit · Duplicates flagged across all members
      </div>
    </div>
  );

