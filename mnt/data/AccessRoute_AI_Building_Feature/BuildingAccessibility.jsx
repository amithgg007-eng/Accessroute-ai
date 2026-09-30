import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:3001/api";

const buildingTypes = [
  "College",
  "School",
  "Hospital",
  "Office",
  "Government Building",
  "Shopping Mall",
  "Public Building",
  "Other",
];

const accessibilityOptions = ["Yes", "No", "Unknown"];

function accessibilityLabel(value) {
  if (value === "Yes") return "✅ Yes";
  if (value === "No") return "❌ No";
  return "⚠️ Unknown";
}

function getBuildingScore(building) {
  let score = 100;
  if (building.lift === "No") score -= 20;
  if (building.ramp === "No") score -= 15;
  if (building.accessibleEntrance === "No") score -= 20;
  if (building.accessibleToilet === "No") score -= 10;
  if (building.accessibleParking === "No") score -= 5;
  if (building.floorInfo && /no lift|stairs only|not accessible/i.test(building.floorInfo)) score -= 15;
  return Math.max(0, score);
}

export default function BuildingAccessibility({
  buildings,
  loading,
  selectedBuilding,
  onSelectBuilding,
  onStartReport,
  reportLocation,
  onCancelReport,
  onSaved,
}) {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "College",
    description: "",
    lift: "Unknown",
    ramp: "Unknown",
    accessibleEntrance: "Unknown",
    accessibleToilet: "Unknown",
    accessibleParking: "Unknown",
    stairs: "Unknown",
    floorInfo: "",
    image: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!reportLocation) return;
    setForm((current) => ({
      ...current,
      name: current.name || "",
    }));
  }, [reportLocation]);

  const filteredBuildings = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return buildings;
    return buildings.filter((building) =>
      [building.name, building.type, building.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [buildings, search]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Please choose an image smaller than 5 MB.");
      event.target.value = "";
      return;
    }
    update("image", file);
  };

  const imageToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const submit = async () => {
    if (!reportLocation) {
      alert("Click the map to select the building location first.");
      return;
    }
    if (!form.name.trim()) {
      alert("Enter the building name.");
      return;
    }

    try {
      setSaving(true);
      const image = form.image ? await imageToBase64(form.image) : null;
      const response = await fetch(`${API_URL}/buildings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          description: form.description.trim(),
          latitude: reportLocation[0],
          longitude: reportLocation[1],
          image,
          lift: form.lift,
          ramp: form.ramp,
          accessibleEntrance: form.accessibleEntrance,
          accessibleToilet: form.accessibleToilet,
          accessibleParking: form.accessibleParking,
          stairs: form.stairs,
          floorInfo: form.floorInfo.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save building");

      setForm({
        name: "",
        type: "College",
        description: "",
        lift: "Unknown",
        ramp: "Unknown",
        accessibleEntrance: "Unknown",
        accessibleToilet: "Unknown",
        accessibleParking: "Unknown",
        stairs: "Unknown",
        floorInfo: "",
        image: null,
      });
      onSaved(data);
      alert("Building accessibility report saved! 🏢♿");
    } catch (error) {
      console.error(error);
      alert(error.message || "Could not save the building report.");
    } finally {
      setSaving(false);
    }
  };

  const verify = async (id, action) => {
    try {
      const response = await fetch(`${API_URL}/buildings/${id}/${action}`, {
        method: "PATCH",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verification failed");
      onSaved(data.building || data);
    } catch (error) {
      console.error(error);
      alert(error.message || "Could not update community verification.");
    }
  };

  return (
    <section className="report-section" id="buildings">
      <div className="section-heading">
        <div>
          <p className="small-title">COMMUNITY BUILDING DATA</p>
          <h2>Building accessibility</h2>
          <p style={{ color: "#64748b", maxWidth: "720px" }}>
            Help wheelchair users and other people with mobility needs know whether a
            building has a lift, ramp, accessible entrance and accessible facilities.
          </p>
        </div>
        <button className="location-btn" onClick={onStartReport}>
          🏢 Report Building
        </button>
      </div>

      <div style={{ marginBottom: "18px" }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search building, college, hospital..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "14px 16px",
            border: "1px solid #cbd5e1",
            borderRadius: "12px",
            fontSize: "15px",
          }}
        />
      </div>

      {reportLocation && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: "720px" }}>
            <div className="modal-header">
              <h2>🏢 Report Building Accessibility</h2>
              <button className="modal-close" onClick={onCancelReport}>×</button>
            </div>

            <div style={{ marginBottom: "14px", padding: "12px", background: "#f0fdf4", borderRadius: "10px" }}>
              📍 Location selected: {reportLocation[0].toFixed(6)}, {reportLocation[1].toFixed(6)}
            </div>

            <label className="auth-field">
              <span>Building name *</span>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Saveetha Engineering College - Main Block" />
            </label>

            <label className="auth-field">
              <span>Building type</span>
              <select value={form.type} onChange={(e) => update("type", e.target.value)}>
                {buildingTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>

            <label className="auth-field">
              <span>Description</span>
              <textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe the accessibility situation..." rows={3} />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "12px" }}>
              {[
                ["lift", "🛗 Lift"],
                ["ramp", "♿ Ramp"],
                ["accessibleEntrance", "🚪 Accessible entrance"],
                ["accessibleToilet", "🚻 Accessible toilet"],
                ["accessibleParking", "🅿️ Accessible parking"],
                ["stairs", "🪜 Stairs"],
              ].map(([key, label]) => (
                <label className="auth-field" key={key}>
                  <span>{label}</span>
                  <select value={form[key]} onChange={(e) => update(key, e.target.value)}>
                    {accessibilityOptions.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
              ))}
            </div>

            <label className="auth-field">
              <span>Floor-level accessibility notes</span>
              <textarea
                value={form.floorInfo}
                onChange={(e) => update("floorInfo", e.target.value)}
                placeholder="Example: Ground floor accessible. First floor has stairs only because there is no lift."
                rows={3}
              />
            </label>

            <label className="auth-field">
              <span>Photo</span>
              <input type="file" accept="image/*" onChange={handleImage} />
            </label>

            {form.image && (
              <div style={{ marginBottom: "12px" }}>
                <p style={{ margin: "0 0 6px" }}>📷 {form.image.name}</p>
                <img
                  src={URL.createObjectURL(form.image)}
                  alt="Building preview"
                  style={{ width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: "12px", border: "1px solid #dbe7e2" }}
                />
              </div>
            )}

            <div className="modal-actions">
              <button className="cancel-btn" onClick={onCancelReport}>Cancel</button>
              <button className="submit-btn" onClick={submit} disabled={saving}>
                {saving ? "Saving..." : "🏢 Submit Building Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div>Loading building reports...</div>
      ) : filteredBuildings.length === 0 ? (
        <div style={{ padding: "30px", textAlign: "center", background: "#fff", border: "1px solid #dbe7e2", borderRadius: "14px" }}>
          🏢 No building reports found. Be the first to report one.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "16px" }}>
          {filteredBuildings.map((building) => {
            const score = getBuildingScore(building);
            const selected = selectedBuilding?.id === building.id;
            return (
              <div
                key={building.id}
                className="barrier-card"
                style={{ cursor: "pointer", border: selected ? "2px solid #0f766e" : undefined }}
                onClick={() => onSelectBuilding(building)}
              >
                {building.image && (
                  <img src={building.image} alt={building.name} style={{ width: "100%", height: "160px", objectFit: "cover", borderRadius: "12px", marginBottom: "12px" }} />
                )}
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                  <strong>{building.name}</strong>
                  <span style={{ fontWeight: "800", color: score >= 80 ? "#15803d" : score >= 60 ? "#b45309" : "#b91c1c" }}>{score}/100</span>
                </div>
                <p style={{ color: "#64748b", margin: "6px 0" }}>{building.type}</p>
                <p>{building.description || "No description provided."}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "13px" }}>
                  <span>🛗 {accessibilityLabel(building.lift)}</span>
                  <span>♿ {accessibilityLabel(building.ramp)}</span>
                  <span>🚪 {accessibilityLabel(building.accessibleEntrance)}</span>
                  <span>🚻 {accessibilityLabel(building.accessibleToilet)}</span>
                </div>
                <div style={{ marginTop: "10px", color: "#64748b", fontSize: "13px" }}>
                  👥 {building.confirmCount || 0} accurate · 🔄 {building.changedCount || 0} changed
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedBuilding && (
        <div style={{ marginTop: "20px", padding: "20px", background: "#fff", border: "1px solid #dbe7e2", borderRadius: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "15px", flexWrap: "wrap" }}>
            <div>
              <p className="small-title">SELECTED BUILDING</p>
              <h3 style={{ margin: "4px 0" }}>{selectedBuilding.name}</h3>
              <p style={{ color: "#64748b" }}>{selectedBuilding.type}</p>
            </div>
            <button className="secondary-button" onClick={() => onSelectBuilding(null)}>Close</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "10px", marginTop: "15px" }}>
            <div className="building-detail-item">🛗 Lift<br /><strong>{accessibilityLabel(selectedBuilding.lift)}</strong></div>
            <div className="building-detail-item">♿ Ramp<br /><strong>{accessibilityLabel(selectedBuilding.ramp)}</strong></div>
            <div className="building-detail-item">🚪 Entrance<br /><strong>{accessibilityLabel(selectedBuilding.accessibleEntrance)}</strong></div>
            <div className="building-detail-item">🚻 Toilet<br /><strong>{accessibilityLabel(selectedBuilding.accessibleToilet)}</strong></div>
            <div className="building-detail-item">🅿️ Parking<br /><strong>{accessibilityLabel(selectedBuilding.accessibleParking)}</strong></div>
            <div className="building-detail-item">🪜 Stairs<br /><strong>{accessibilityLabel(selectedBuilding.stairs)}</strong></div>
          </div>

          {selectedBuilding.floorInfo && (
            <div style={{ marginTop: "14px", padding: "14px", background: "#fff7ed", borderRadius: "12px", color: "#9a3412" }}>
              <strong>🏢 Floor accessibility</strong>
              <p style={{ marginBottom: 0 }}>{selectedBuilding.floorInfo}</p>
            </div>
          )}

          {selectedBuilding.image && (
            <img src={selectedBuilding.image} alt={selectedBuilding.name} style={{ width: "100%", maxHeight: "320px", objectFit: "cover", borderRadius: "14px", marginTop: "15px" }} />
          )}

          <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button className="secondary-button" onClick={() => verify(selectedBuilding.id, "confirm")}>👍 Still accurate ({selectedBuilding.confirmCount || 0})</button>
            <button className="secondary-button" onClick={() => verify(selectedBuilding.id, "changed")}>🔄 Information changed ({selectedBuilding.changedCount || 0})</button>
          </div>
          <p style={{ color: "#64748b", fontSize: "13px" }}>
            Last verified: {selectedBuilding.lastVerified ? new Date(selectedBuilding.lastVerified).toLocaleString() : "Not verified yet"}
          </p>
        </div>
      )}
    </section>
  );
}
