"use client";

import React, { useState, useEffect } from "react";
import { getSupabase } from "../lib/supabase";
import Link from "next/link";

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  alert("SQL snippet copied to clipboard! Run this in the Supabase SQL Editor.");
}

export default function BudgetTracker() {
  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  
  const [newEventName, setNewEventName] = useState("");
  const [newItemParams, setNewItemParams] = useState({
    name: "",
    event_name: "",
    amount: "",
    paid: false,
  });

  const [editingId, setEditingId] = useState(null);
  const [editingParams, setEditingParams] = useState({});

  useEffect(() => {
    async function loadData() {
      // Load events
      const { data: eventData, error: eventError } = await getSupabase()
        .from("budget_events")
        .select("*")
        .order("created_at", { ascending: true });

      if (eventError) {
        if (eventError.code === "42P01") {
          setDbError("Tables do not exist. Please run the SQL snippet.");
        } else {
          setDbError(eventError.message);
        }
        setLoading(false);
        return;
      }

      setEvents(eventData || []);
      
      if (eventData && eventData.length > 0) {
        setNewItemParams(prev => ({ ...prev, event_name: eventData[0].name }));
      }

      // Load items
      const { data: itemData, error: itemError } = await getSupabase()
        .from("budget_items")
        .select("*")
        .order("created_at", { ascending: true });
        
      if (!itemError) {
        setItems(itemData || []);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const addEvent = async (e) => {
    e.preventDefault();
    if (!newEventName.trim()) return;
    
    // Check if event already exists
    if (events.find(ev => ev.name.toLowerCase() === newEventName.trim().toLowerCase())) {
        alert("Event already exists!");
        return;
    }

    const { data, error } = await getSupabase()
      .from("budget_events")
      .insert([{ name: newEventName.trim() }])
      .select();

    if (error) {
      alert("Error adding event: " + error.message);
      return;
    }

    if (data && data[0]) {
      const updatedEvents = [...events, data[0]];
      setEvents(updatedEvents);
      setNewEventName("");
      if (!newItemParams.event_name) {
        setNewItemParams(prev => ({ ...prev, event_name: data[0].name }));
      }
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItemParams.name || !newItemParams.event_name) {
      alert("Please enter a name and select an event. (You may need to add an event first!)");
      return;
    }

    const payload = {
      ...newItemParams,
      amount: parseFloat(newItemParams.amount) || 0,
    };

    const { data, error } = await getSupabase()
      .from("budget_items")
      .insert([payload])
      .select();

    if (error) {
      alert("Error adding item: " + error.message);
      return;
    }

    if (data && data[0]) {
      setItems([...items, data[0]]);
      setNewItemParams({
        name: "",
        event_name: newItemParams.event_name, // keep last selected
        amount: "",
        paid: false,
      });
    }
  };

  const deleteItem = async (id) => {
    const { error } = await getSupabase().from("budget_items").delete().eq("id", id);
    if (!error) {
      setItems(items.filter((item) => item.id !== id));
    } else {
      alert("Error deleting: " + error.message);
    }
  };

  const deleteEvent = async (name) => {
    if(!window.confirm(`Are you sure you want to delete the event '${name}'? All expenses tied to it will also be deleted!`)) {
      return;
    }
    
    // Delete items first to bypass potential foreign key errors
    await getSupabase().from("budget_items").delete().eq("event_name", name);
    
    const { error } = await getSupabase().from("budget_events").delete().eq("name", name);
    if (!error) {
      setEvents(events.filter(ev => ev.name !== name));
      setItems(items.filter(it => it.event_name !== name));
      if (newItemParams.event_name === name) {
        setNewItemParams({ ...newItemParams, event_name: "" });
      }
    } else {
      alert("Error deleting event: " + error.message);
    }
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditingParams({ ...item });
  };

  const saveEdit = async () => {
    if (!editingParams.name || !editingParams.event_name) {
      alert("Name and Event are required.");
      return;
    }

    const payload = {
      name: editingParams.name,
      event_name: editingParams.event_name,
      amount: parseFloat(editingParams.amount) || 0,
      paid: editingParams.paid,
    };

    const { error } = await getSupabase()
      .from("budget_items")
      .update(payload)
      .eq("id", editingId);

    if (error) {
      alert("Error saving: " + error.message);
      return;
    }

    setItems(items.map((it) => (it.id === editingId ? { ...it, ...payload } : it)));
    setEditingId(null);
  };

  const togglePaid = async (item) => {
    const newPaid = !item.paid;
    const { error } = await getSupabase()
      .from("budget_items")
      .update({ paid: newPaid })
      .eq("id", item.id);

    if (!error) {
      setItems(items.map((it) => (it.id === item.id ? { ...it, paid: newPaid } : it)));
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: "#a09585" }}>
        Loading...
      </div>
    );
  }

  const grandTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const grandPaid = items.reduce((sum, item) => sum + (item.paid ? (item.amount || 0) : 0), 0);

  // Calculate totals per event
  const eventsTotals = events.map(ev => {
    const eventItems = items.filter(it => it.event_name === ev.name);
    const total = eventItems.reduce((sum, it) => sum + (it.amount || 0), 0);
    const paid = eventItems.reduce((sum, it) => sum + (it.paid ? (it.amount || 0) : 0), 0);
    return { name: ev.name, total, paid };
  });

  const sqlSnippet = `
DROP TABLE IF EXISTS budget_items;
DROP TABLE IF EXISTS budget_events;

CREATE TABLE budget_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE budget_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name text NOT NULL REFERENCES budget_events(name) ON DELETE CASCADE ON UPDATE CASCADE,
  name text NOT NULL,
  amount numeric DEFAULT 0,
  paid boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
  `.trim();

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#faf7f2 0%,#f3ece2 40%,#ede5d8 100%)", fontFamily: "'DM Sans', sans-serif", padding: "20px 10px 40px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: "#b8a992", textTransform: "uppercase", marginBottom: 4 }}>
          Wedding
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: "#3d3428", margin: 0 }}>
          Budget <span style={{ color: "#c4917b" }}>✦</span> Manager
        </h1>
        <div style={{ width: 60, height: 2, background: "linear-gradient(90deg,transparent,#c4a97d,transparent)", margin: "6px auto 0" }} />
      </div>

      {dbError && (
        <div style={{ maxWidth: 960, margin: "0 auto 20px", background: "#fef8ec", border: "1px solid #f0c96b", borderRadius: 10, padding: "16px", color: "#8a6d20" }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: 16 }}>⚠️ Database Setup Required</h3>
          <p style={{ margin: "0 0 10px 0", fontSize: 14, color: "#3d3428" }}>{dbError}</p>
          <div style={{ background: "#fff", padding: "10px", borderRadius: 6, fontSize: 12, fontFamily: "monospace", overflowX: "auto", position: "relative" }}>
            <button 
              onClick={() => copyToClipboard(sqlSnippet)}
              style={{ position: "absolute", top: 10, right: 10, background: "#8a6d20", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontSize: 10 }}
            >
              Copy
            </button>
            <pre style={{ margin: 0 }}>{sqlSnippet}</pre>
          </div>
        </div>
      )}

      {!dbError && (
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          
          {/* Main Grand Total Dashboard */}
          <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", minWidth: 200, flex: 1, boxShadow: "0 2px 14px rgba(139,115,85,0.07)", borderTop: "3px solid #6b8f71" }}>
              <div style={{ fontSize: 11, color: "#a09585", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Grand Total Spend</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#3d3428" }}>{formatCurrency(grandTotal)}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", minWidth: 200, flex: 1, boxShadow: "0 2px 14px rgba(139,115,85,0.07)", borderTop: "3px solid #8b7355" }}>
              <div style={{ fontSize: 11, color: "#a09585", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Grand Total Paid</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#3d3428" }}>{formatCurrency(grandPaid)}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
            
            <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Event Setup Form */}
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 14px rgba(139,115,85,0.07)" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: 16, color: "#3d3428", fontFamily: "'Playfair Display', serif" }}>Events Management</h3>
                <form onSubmit={addEvent} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <input
                    type="text"
                    placeholder="New Event (e.g. Sangeet)"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #e0d9ce", fontSize: 14, color: "#3d3428" }}
                  />
                  <button type="submit" style={{ background: "#c4917b", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}>
                    Add
                  </button>
                </form>
                
                {events.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {eventsTotals.map((ev) => (
                      <div key={ev.name} style={{ background: "#faf7f2", borderRadius: 8, padding: "10px 14px", border: "1px solid #efeae0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 600, color: "#3d3428", fontSize: 14, color: "#3d3428" }}>{ev.name}</div>
                          <div style={{ fontSize: 12, color: "#8a7d6b", marginTop: 2 }}>
                            Total: <strong>{formatCurrency(ev.total)}</strong> <span style={{opacity: 0.5}}>|</span> Paid: <strong style={{color: "#6b8f71"}}>{formatCurrency(ev.paid)}</strong>
                          </div>
                        </div>
                        <button onClick={() => deleteEvent(ev.name)} style={{ background: "transparent", border: "none", color: "#c4a97d", cursor: "pointer", fontSize: 12 }}>🗑</button>
                      </div>
                    ))}
                  </div>
                )}
                {events.length === 0 && <div style={{ fontSize: 13, color: "#a09585" }}>No events added yet!</div>}
              </div>

              {/* Add Expense Form */}
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 14px rgba(139,115,85,0.07)" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: 16, color: "#3d3428", fontFamily: "'Playfair Display', serif" }}>Add Expense</h3>
                <form onSubmit={addItem} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Expense Name (e.g. Venue Booking)"
                    value={newItemParams.name}
                    onChange={(e) => setNewItemParams({ ...newItemParams, name: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #e0d9ce", fontSize: 14, color: "#3d3428" }}
                    required
                  />
                  <select
                    value={newItemParams.event_name}
                    onChange={(e) => setNewItemParams({ ...newItemParams, event_name: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #e0d9ce", fontSize: 14, color: "#3d3428", background: "#fff" }}
                    required
                  >
                    <option value="" disabled>Select Event...</option>
                    {events.map(ev => <option key={ev.name} value={ev.name}>{ev.name}</option>)}
                  </select>
                  <input
                    type="number"
                    placeholder="Amount (₹)"
                    value={newItemParams.amount}
                    onChange={(e) => setNewItemParams({ ...newItemParams, amount: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #e0d9ce", fontSize: 14, color: "#3d3428" }}
                    required
                  />
                  <button
                    type="submit"
                    style={{ background: "#3d3428", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontWeight: 600, cursor: "pointer", marginTop: 4 }}
                    disabled={events.length === 0}
                  >
                    Add Expense
                  </button>
                </form>
              </div>
            </div>

            {/* Expenses List */}
            <div style={{ flex: "2 1 400px", background: "#fff", borderRadius: 14, boxShadow: "0 2px 14px rgba(139,115,85,0.07)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, color: "#3d3428", textAlign: "left" }}>
                <thead style={{ background: "#faf7f2", borderBottom: "1px solid #f0ebe4" }}>
                  <tr>
                    <th style={{ padding: "14px 16px", color: "#8a7d6b", fontWeight: 600 }}>Expense</th>
                    <th style={{ padding: "14px 16px", color: "#8a7d6b", fontWeight: 600 }}>Event</th>
                    <th style={{ padding: "14px 16px", color: "#8a7d6b", fontWeight: 600 }}>Amount</th>
                    <th style={{ padding: "14px 16px", color: "#8a7d6b", fontWeight: 600, textAlign: "center" }}>Paid</th>
                    <th style={{ padding: "14px 16px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#b8a992" }}>No expenses yet. Add one!</td></tr>
                  ) : items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f0ebe4" }}>
                      {editingId === item.id ? (
                        <>
                          <td style={{ padding: "10px 16px" }}>
                            <input type="text" value={editingParams.name} onChange={e => setEditingParams({...editingParams, name: e.target.value})} style={{ width: "100%", padding: "6px", border: "1px solid #e0d9ce", borderRadius: 4 }} />
                          </td>
                          <td style={{ padding: "10px 16px" }}>
                            <select value={editingParams.event_name} onChange={e => setEditingParams({...editingParams, event_name: e.target.value})} style={{ width: "100%", padding: "6px", border: "1px solid #e0d9ce", borderRadius: 4 }}>
                              {events.map(ev => <option key={ev.name} value={ev.name}>{ev.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: "10px 16px" }}>
                            <input type="number" value={editingParams.amount} onChange={e => setEditingParams({...editingParams, amount: e.target.value})} style={{ width: "80px", padding: "6px", border: "1px solid #e0d9ce", borderRadius: 4 }} />
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "center" }}>
                            <input type="checkbox" checked={editingParams.paid} onChange={e => setEditingParams({...editingParams, paid: e.target.checked})} />
                          </td>
                          <td style={{ padding: "10px 16px", textAlign: "right" }}>
                            <button onClick={saveEdit} style={{ background: "#6b8f71", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", marginRight: 6 }}>Save</button>
                            <button onClick={() => setEditingId(null)} style={{ background: "#eee", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: "16px", fontWeight: 500, color: "#3d3428" }}>{item.name}</td>
                          <td style={{ padding: "16px" }}>
                            <span style={{ 
                              background: "#f0ebe4", 
                              color: "#6b5e50", 
                              padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600
                            }}>
                              {item.event_name}
                            </span>
                          </td>
                          <td style={{ padding: "16px", color: "#8a7d6b", fontWeight: 600 }}>{formatCurrency(item.amount)}</td>
                          <td style={{ padding: "16px", textAlign: "center" }}>
                            <input type="checkbox" checked={item.paid} onChange={() => togglePaid(item)} style={{ cursor: "pointer", width: 16, height: 16, accentColor: "#6b8f71" }} />
                          </td>
                          <td style={{ padding: "16px", textAlign: "right" }}>
                            <button onClick={() => startEditing(item)} style={{ background: "transparent", border: "none", color: "#a09585", cursor: "pointer", marginRight: 8, fontSize: 14, color: "#3d3428" }}>✎</button>
                            <button onClick={() => deleteItem(item.id)} style={{ background: "transparent", border: "none", color: "#c4917b", cursor: "pointer", fontSize: 14, color: "#3d3428" }}>🗑</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
