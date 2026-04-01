"use client";

import React, { useState, useEffect } from "react";
import { getSupabase } from "../lib/supabase";
import Link from "next/link";

const CATEGORIES = ["Venue", "Catering", "Photography", "Attire", "Decor", "Other"];

const CATEGORY_COLORS = {
  Venue: "#6b8f71",
  Catering: "#c4917b",
  Photography: "#8b7355",
  Attire: "#7b8fa6",
  Decor: "#9e8b7c",
  Other: "#a09585",
};

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  alert("SQL snippet copied to clipboard! Run this in the Supabase SQL Editor.");
}

export default function BudgetTracker() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  
  const [newItemParams, setNewItemParams] = useState({
    name: "",
    category: "Venue",
    estimated_cost: "",
    actual_cost: "",
    paid: false,
  });

  const [editingId, setEditingId] = useState(null);
  const [editingParams, setEditingParams] = useState({});

  useEffect(() => {
    async function loadData() {
      const { data, error } = await getSupabase()
        .from("budget_items")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        if (error.code === "42P01") {
          setDbError("Table 'budget_items' does not exist.");
        } else {
          setDbError(error.message);
        }
        setLoading(false);
        return;
      }

      setItems(data || []);
      setLoading(false);
    }
    loadData();
  }, []);

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItemParams.name) return;

    const payload = {
      ...newItemParams,
      estimated_cost: parseFloat(newItemParams.estimated_cost) || 0,
      actual_cost: parseFloat(newItemParams.actual_cost) || 0,
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
        category: "Venue",
        estimated_cost: "",
        actual_cost: "",
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

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditingParams({ ...item });
  };

  const saveEdit = async () => {
    const payload = {
      name: editingParams.name,
      category: editingParams.category,
      estimated_cost: parseFloat(editingParams.estimated_cost) || 0,
      actual_cost: parseFloat(editingParams.actual_cost) || 0,
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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", color: "#a09585" }}>
        Loading...
      </div>
    );
  }

  const totalEstimated = items.reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
  const totalActual = items.reduce((sum, item) => sum + (item.actual_cost || 0), 0);
  const totalPaid = items.reduce((sum, item) => sum + (item.paid ? (item.actual_cost || item.estimated_cost || 0) : 0), 0);

  const sqlSnippet = `
CREATE TABLE budget_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  name text NOT NULL,
  estimated_cost numeric DEFAULT 0,
  actual_cost numeric DEFAULT 0,
  paid boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
  `.trim();

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#faf7f2 0%,#f3ece2 40%,#ede5d8 100%)", fontFamily: "'DM Sans', sans-serif", padding: "20px 10px 40px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <Link href="/" style={{ color: "#a09585", fontSize: 12, textDecoration: "none", display: "inline-block", marginBottom: 10 }}>← Back to Guest List</Link>
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
          <p style={{ margin: "0 0 10px 0", fontSize: 14 }}>{dbError}</p>
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
          {/* Summary Dashboard */}
          <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", minWidth: 200, flex: 1, boxShadow: "0 2px 14px rgba(139,115,85,0.07)", borderTop: "3px solid #6b8f71" }}>
              <div style={{ fontSize: 11, color: "#a09585", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Estimated Budget</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#3d3428" }}>{formatCurrency(totalEstimated)}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", minWidth: 200, flex: 1, boxShadow: "0 2px 14px rgba(139,115,85,0.07)", borderTop: "3px solid #c4917b" }}>
              <div style={{ fontSize: 11, color: "#a09585", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Actual Cost</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#3d3428" }}>{formatCurrency(totalActual)}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 14, padding: "16px 20px", minWidth: 200, flex: 1, boxShadow: "0 2px 14px rgba(139,115,85,0.07)", borderTop: "3px solid #8b7355" }}>
              <div style={{ fontSize: 11, color: "#a09585", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Total Paid</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#3d3428" }}>{formatCurrency(totalPaid)}</div>
            </div>
          </div>

          {/* Form to add item */}
          <form onSubmit={addItem} style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 14px rgba(139,115,85,0.07)", marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16, color: "#3d3428", fontFamily: "'Playfair Display', serif" }}>Add Expense</h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Item Name (e.g. DJ)"
                value={newItemParams.name}
                onChange={(e) => setNewItemParams({ ...newItemParams, name: e.target.value })}
                style={{ flex: "1 1 200px", padding: "10px 14px", borderRadius: 8, border: "1px solid #e0d9ce", fontSize: 14 }}
                required
              />
              <select
                value={newItemParams.category}
                onChange={(e) => setNewItemParams({ ...newItemParams, category: e.target.value })}
                style={{ flex: "0 1 150px", padding: "10px 14px", borderRadius: 8, border: "1px solid #e0d9ce", fontSize: 14, background: "#fff" }}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="number"
                placeholder="Est. Cost"
                value={newItemParams.estimated_cost}
                onChange={(e) => setNewItemParams({ ...newItemParams, estimated_cost: e.target.value })}
                style={{ flex: "0 1 120px", padding: "10px 14px", borderRadius: 8, border: "1px solid #e0d9ce", fontSize: 14 }}
              />
              <input
                type="number"
                placeholder="Actual Cost"
                value={newItemParams.actual_cost}
                onChange={(e) => setNewItemParams({ ...newItemParams, actual_cost: e.target.value })}
                style={{ flex: "0 1 120px", padding: "10px 14px", borderRadius: 8, border: "1px solid #e0d9ce", fontSize: 14 }}
              />
              <button
                type="submit"
                style={{ background: "#3d3428", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer", transition: "0.2s" }}
              >
                Add
              </button>
            </div>
          </form>

          {/* Items List */}
          <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 14px rgba(139,115,85,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, textAlign: "left" }}>
              <thead style={{ background: "#faf7f2", borderBottom: "1px solid #f0ebe4" }}>
                <tr>
                  <th style={{ padding: "14px 20px", color: "#8a7d6b", fontWeight: 600 }}>Item</th>
                  <th style={{ padding: "14px 20px", color: "#8a7d6b", fontWeight: 600 }}>Category</th>
                  <th style={{ padding: "14px 20px", color: "#8a7d6b", fontWeight: 600 }}>Est. Cost</th>
                  <th style={{ padding: "14px 20px", color: "#8a7d6b", fontWeight: 600 }}>Actual</th>
                  <th style={{ padding: "14px 20px", color: "#8a7d6b", fontWeight: 600, textAlign: "center" }}>Paid</th>
                  <th style={{ padding: "14px 20px" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "#b8a992" }}>No items yet. Add one above!</td></tr>
                ) : items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f0ebe4" }}>
                    {editingId === item.id ? (
                      <>
                        <td style={{ padding: "10px 20px" }}>
                          <input type="text" value={editingParams.name} onChange={e => setEditingParams({...editingParams, name: e.target.value})} style={{ width: "100%", padding: "6px", border: "1px solid #e0d9ce", borderRadius: 4 }} />
                        </td>
                        <td style={{ padding: "10px 20px" }}>
                          <select value={editingParams.category} onChange={e => setEditingParams({...editingParams, category: e.target.value})} style={{ width: "100%", padding: "6px", border: "1px solid #e0d9ce", borderRadius: 4 }}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "10px 20px" }}>
                          <input type="number" value={editingParams.estimated_cost} onChange={e => setEditingParams({...editingParams, estimated_cost: e.target.value})} style={{ width: "80px", padding: "6px", border: "1px solid #e0d9ce", borderRadius: 4 }} />
                        </td>
                        <td style={{ padding: "10px 20px" }}>
                          <input type="number" value={editingParams.actual_cost} onChange={e => setEditingParams({...editingParams, actual_cost: e.target.value})} style={{ width: "80px", padding: "6px", border: "1px solid #e0d9ce", borderRadius: 4 }} />
                        </td>
                        <td style={{ padding: "10px 20px", textAlign: "center" }}>
                          <input type="checkbox" checked={editingParams.paid} onChange={e => setEditingParams({...editingParams, paid: e.target.checked})} />
                        </td>
                        <td style={{ padding: "10px 20px", textAlign: "right" }}>
                          <button onClick={saveEdit} style={{ background: "#6b8f71", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", marginRight: 6 }}>Save</button>
                          <button onClick={() => setEditingId(null)} style={{ background: "#eee", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: "16px 20px", fontWeight: 500, color: "#3d3428" }}>{item.name}</td>
                        <td style={{ padding: "16px 20px" }}>
                          <span style={{ 
                            background: CATEGORY_COLORS[item.category] ? CATEGORY_COLORS[item.category] + "20" : "#eee", 
                            color: CATEGORY_COLORS[item.category] || "#666", 
                            padding: "4px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, textTransform: "uppercase" 
                          }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ padding: "16px 20px", color: "#8a7d6b" }}>{formatCurrency(item.estimated_cost)}</td>
                        <td style={{ padding: "16px 20px", color: "#8a7d6b" }}>{formatCurrency(item.actual_cost)}</td>
                        <td style={{ padding: "16px 20px", textAlign: "center" }}>
                          <input type="checkbox" checked={item.paid} onChange={() => togglePaid(item)} style={{ cursor: "pointer", width: 16, height: 16, accentColor: "#6b8f71" }} />
                        </td>
                        <td style={{ padding: "16px 20px", textAlign: "right" }}>
                          <button onClick={() => startEditing(item)} style={{ background: "transparent", border: "none", color: "#a09585", cursor: "pointer", marginRight: 8 }}>✎</button>
                          <button onClick={() => deleteItem(item.id)} style={{ background: "transparent", border: "none", color: "#c4917b", cursor: "pointer" }}>🗑</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
