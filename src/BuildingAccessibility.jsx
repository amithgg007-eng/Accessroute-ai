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

    if (
        building.floorInfo &&
        /no lift|stairs only|not accessible/i.test(
            building.floorInfo
        )
    ) {
        score -= 15;
    }

    return Math.max(0, score);
}

function getScoreColor(score) {
    if (score >= 80) return "#15803d";
    if (score >= 60) return "#b45309";
    return "#dc2626";
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
    const [previewUrl, setPreviewUrl] = useState(null);

    /* =====================================================
       IMAGE PREVIEW
       ===================================================== */

    useEffect(() => {
        if (!form.image) {
            setPreviewUrl(null);
            return;
        }

        const url = URL.createObjectURL(form.image);
        setPreviewUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [form.image]);

    /* =====================================================
       RESET FORM WHEN REPORT STARTS
       ===================================================== */

    useEffect(() => {
        if (!reportLocation) return;

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
    }, [reportLocation]);

    /* =====================================================
       FILTER BUILDINGS
       ===================================================== */

    const filteredBuildings = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return buildings;

        return buildings.filter((building) =>
            [
                building.name,
                building.type,
                building.description,
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value)
                        .toLowerCase()
                        .includes(query)
                )
        );
    }, [buildings, search]);

    /* =====================================================
       UPDATE FORM
       ===================================================== */

    const update = (key, value) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    /* =====================================================
       IMAGE SELECT
       ===================================================== */

    const handleImage = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file.");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert(
                "Please choose an image smaller than 5 MB."
            );
            event.target.value = "";
            return;
        }

        update("image", file);
    };

    /* =====================================================
       IMAGE → BASE64
       ===================================================== */

    const imageToBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () =>
                resolve(reader.result);

            reader.onerror = reject;

            reader.readAsDataURL(file);
        });

    /* =====================================================
       SUBMIT BUILDING
       ===================================================== */

    const submit = async () => {
        if (!reportLocation) {
            alert(
                "Click the map to select the building location first."
            );
            return;
        }

        if (!form.name.trim()) {
            alert("Please enter the building name.");
            return;
        }

        try {
            setSaving(true);

            const image = form.image
                ? await imageToBase64(form.image)
                : null;

            const response = await fetch(
                `${API_URL}/buildings`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        name: form.name.trim(),

                        type: form.type,

                        description:
                            form.description.trim(),

                        latitude: reportLocation[0],

                        longitude: reportLocation[1],

                        image,

                        lift: form.lift,

                        ramp: form.ramp,

                        accessibleEntrance:
                            form.accessibleEntrance,

                        accessibleToilet:
                            form.accessibleToilet,

                        accessibleParking:
                            form.accessibleParking,

                        stairs: form.stairs,

                        floorInfo:
                            form.floorInfo.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Failed to save building report."
                );
            }

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

            alert(
                "Building accessibility report saved! 🏢♿"
            );
        } catch (error) {
            console.error(
                "Building report error:",
                error
            );

            alert(
                error.message ||
                "Could not save the building report."
            );
        } finally {
            setSaving(false);
        }
    };

    /* =====================================================
       COMMUNITY VERIFICATION
       ===================================================== */

    const verify = async (id, action) => {
        try {
            const response = await fetch(
                `${API_URL}/buildings/${id}/${action}`,
                {
                    method: "PATCH",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Verification failed."
                );
            }

            onSaved(data.building || data);
        } catch (error) {
            console.error(
                "Building verification error:",
                error
            );

            alert(
                error.message ||
                "Could not update community verification."
            );
        }
    };

    /* =====================================================
       ACCESSIBILITY FIELD
       ===================================================== */

    const accessibilityFields = [
        {
            key: "lift",
            icon: "🛗",
            label: "Lift",
        },
        {
            key: "ramp",
            icon: "♿",
            label: "Ramp",
        },
        {
            key: "accessibleEntrance",
            icon: "🚪",
            label: "Accessible entrance",
        },
        {
            key: "accessibleToilet",
            icon: "🚻",
            label: "Accessible toilet",
        },
        {
            key: "accessibleParking",
            icon: "🅿️",
            label: "Accessible parking",
        },
        {
            key: "stairs",
            icon: "🪜",
            label: "Stairs",
        },
    ];

    /* =====================================================
       RETURN
       ===================================================== */

    return (
        <section
            className="report-section"
            id="buildings"
        >
            {/* =================================================
          HEADER
          ================================================= */}

            <div className="section-heading">
                <div>
                    <p className="small-title">
                        COMMUNITY BUILDING DATA
                    </p>

                    <h2>
                        Building accessibility
                    </h2>

                    <p
                        style={{
                            color: "#64748b",
                            maxWidth: "720px",
                            lineHeight: 1.6,
                            marginTop: "8px",
                        }}
                    >
                        Help wheelchair users and people
                        with mobility needs know whether a
                        building can actually be accessed
                        and used.
                    </p>
                </div>

                <button
                    className="location-btn"
                    onClick={onStartReport}
                >
                    🏢 Report Building
                </button>
            </div>

            {/* =================================================
          SEARCH
          ================================================= */}

            <div
                style={{
                    marginBottom: "20px",
                }}
            >
                <div
                    style={{
                        position: "relative",
                    }}
                >
                    <span
                        style={{
                            position: "absolute",
                            left: "15px",
                            top: "50%",
                            transform:
                                "translateY(-50%)",
                            fontSize: "17px",
                        }}
                    >
                        🔎
                    </span>

                    <input
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Search college, hospital, school or building..."
                        style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding:
                                "14px 16px 14px 45px",
                            border:
                                "1px solid #cbd5e1",
                            borderRadius: "14px",
                            fontSize: "14px",
                            outline: "none",
                            background: "#ffffff",
                        }}
                    />
                </div>
            </div>

            {/* =================================================
          REPORT BUILDING MODAL
          ================================================= */}

            {reportLocation && (
                <div className="modal-overlay">
                    <div className="modal building-modal">
                        {/* HEADER */}

                        <div className="modal-header">
                            <div>
                                <p
                                    style={{
                                        margin: 0,
                                        color: "#0f766e",
                                        fontSize: "12px",
                                        fontWeight: 800,
                                        letterSpacing:
                                            "0.05em",
                                    }}
                                >
                                    COMMUNITY REPORT
                                </p>

                                <h2>
                                    🏢 Report Building
                                    Accessibility
                                </h2>
                            </div>

                            <button
                                className="modal-close"
                                onClick={onCancelReport}
                                type="button"
                            >
                                ×
                            </button>
                        </div>

                        {/* FORM BODY */}

                        <div className="building-form-body">
                            {/* LOCATION */}

                            <div className="building-location-banner">
                                <div className="building-location-icon">
                                    📍
                                </div>

                                <div>
                                    <div
                                        style={{
                                            fontWeight: 800,
                                        }}
                                    >
                                        Building location selected
                                    </div>

                                    <div
                                        style={{
                                            fontSize: "12px",
                                            marginTop: "2px",
                                        }}
                                    >
                                        {reportLocation[0].toFixed(
                                            6
                                        )}
                                        {" , "}
                                        {reportLocation[1].toFixed(
                                            6
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* BASIC INFORMATION */}

                            <div className="building-form-section">
                                <h3 className="building-form-section-title">
                                    <span>🏢</span>
                                    Building information
                                </h3>

                                <div className="building-form-grid">
                                    <label className="building-field">
                                        <span>
                                            Building name *
                                        </span>

                                        <input
                                            value={form.name}
                                            onChange={(event) =>
                                                update(
                                                    "name",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="e.g. Saveetha Engineering College - Main Block"
                                        />
                                    </label>

                                    <label className="building-field">
                                        <span>
                                            Building type
                                        </span>

                                        <select
                                            value={form.type}
                                            onChange={(event) =>
                                                update(
                                                    "type",
                                                    event.target.value
                                                )
                                            }
                                        >
                                            {buildingTypes.map(
                                                (type) => (
                                                    <option
                                                        key={type}
                                                        value={type}
                                                    >
                                                        {type}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </label>

                                    <label className="building-field full">
                                        <span>
                                            Description
                                        </span>

                                        <textarea
                                            value={form.description}
                                            onChange={(event) =>
                                                update(
                                                    "description",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Example: Main building has stairs but no lift. First-floor classrooms are not accessible to wheelchair users."
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* ACCESSIBILITY */}

                            <div className="building-form-section">
                                <h3 className="building-form-section-title">
                                    <span>♿</span>
                                    Accessibility facilities
                                </h3>

                                <div className="building-accessibility-grid">
                                    {accessibilityFields.map(
                                        ({
                                            key,
                                            icon,
                                            label,
                                        }) => (
                                            <div
                                                className="building-accessibility-item"
                                                key={key}
                                            >
                                                <label>
                                                    <span className="building-accessibility-item-title">
                                                        {icon}
                                                        {label}
                                                    </span>

                                                    <select
                                                        value={form[key]}
                                                        onChange={(event) =>
                                                            update(
                                                                key,
                                                                event.target.value
                                                            )
                                                        }
                                                    >
                                                        {accessibilityOptions.map(
                                                            (option) => (
                                                                <option
                                                                    key={option}
                                                                    value={option}
                                                                >
                                                                    {accessibilityLabel(
                                                                        option
                                                                    )}
                                                                </option>
                                                            )
                                                        )}
                                                    </select>
                                                </label>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* FLOOR ACCESSIBILITY */}

                            <div className="building-form-section">
                                <h3 className="building-form-section-title">
                                    <span>🏢</span>
                                    Floor accessibility
                                </h3>

                                <label className="building-field">
                                    <span>
                                        Floor-level accessibility
                                        notes
                                    </span>

                                    <textarea
                                        value={form.floorInfo}
                                        onChange={(event) =>
                                            update(
                                                "floorInfo",
                                                event.target.value
                                            )
                                        }
                                        placeholder="Example: Ground floor is accessible. First floor has stairs only because there is no lift."
                                    />
                                </label>
                            </div>

                            {/* PHOTO */}

                            <div className="building-form-section">
                                <h3 className="building-form-section-title">
                                    <span>📷</span>
                                    Community photo
                                </h3>

                                <div className="building-upload-box">
                                    <div className="building-upload-icon">
                                        📸
                                    </div>

                                    <p className="building-upload-title">
                                        Add a photo of the building
                                    </p>

                                    <p className="building-upload-help">
                                        Show the entrance, ramp,
                                        lift, stairs or other
                                        accessibility information.
                                    </p>

                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImage}
                                    />

                                    <p
                                        style={{
                                            margin:
                                                "10px 0 0",
                                            color: "#94a3b8",
                                            fontSize: "11px",
                                        }}
                                    >
                                        Maximum file size: 5 MB
                                    </p>
                                </div>

                                {form.image &&
                                    previewUrl && (
                                        <div className="building-image-preview">
                                            <img
                                                src={previewUrl}
                                                alt="Building preview"
                                            />

                                            <div className="building-image-name">
                                                📷 {form.image.name}
                                            </div>
                                        </div>
                                    )}
                            </div>

                            {/* ACTIONS */}

                            <div className="modal-actions">
                                <button
                                    className="cancel-btn"
                                    onClick={onCancelReport}
                                    type="button"
                                >
                                    Cancel
                                </button>

                                <button
                                    className="submit-btn"
                                    onClick={submit}
                                    disabled={saving}
                                    type="button"
                                >
                                    {saving
                                        ? "Saving..."
                                        : "🏢 Submit Building Report"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================
          BUILDING LIST
          ================================================= */}

            {loading ? (
                <div
                    style={{
                        padding: "35px",
                        textAlign: "center",
                        background: "#ffffff",
                        border:
                            "1px solid #dbe7e2",
                        borderRadius: "16px",
                    }}
                >
                    <div
                        style={{
                            fontSize: "28px",
                            marginBottom: "8px",
                        }}
                    >
                        🏢
                    </div>

                    Loading building reports...
                </div>
            ) : filteredBuildings.length ===
                0 ? (
                <div
                    style={{
                        padding: "40px 25px",
                        textAlign: "center",
                        background: "#ffffff",
                        border:
                            "1px solid #dbe7e2",
                        borderRadius: "18px",
                    }}
                >
                    <div
                        style={{
                            fontSize: "38px",
                            marginBottom: "10px",
                        }}
                    >
                        🏢
                    </div>

                    <h3
                        style={{
                            margin: "0 0 7px",
                        }}
                    >
                        No building reports found
                    </h3>

                    <p
                        style={{
                            color: "#64748b",
                            margin: 0,
                        }}
                    >
                        Be the first person to report
                        accessibility information for
                        this building.
                    </p>
                </div>
            ) : (
                <div className="building-card-grid">
                    {filteredBuildings.map(
                        (building) => {
                            const score =
                                getBuildingScore(
                                    building
                                );

                            const selected =
                                selectedBuilding?.id ===
                                building.id;

                            return (
                                <div
                                    key={building.id}
                                    className={`building-card ${selected
                                        ? "selected"
                                        : ""
                                        }`}
                                    onClick={() =>
                                        onSelectBuilding(
                                            building
                                        )
                                    }
                                >
                                    {/* IMAGE */}

                                    {building.image ? (
                                        <img
                                            className="building-card-image"
                                            src={building.image}
                                            alt={building.name}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                height: "150px",
                                                display: "flex",
                                                alignItems:
                                                    "center",
                                                justifyContent:
                                                    "center",
                                                background:
                                                    "#f0fdfa",
                                                fontSize: "42px",
                                            }}
                                        >
                                            🏢
                                        </div>
                                    )}

                                    {/* CONTENT */}

                                    <div className="building-card-content">
                                        <div className="building-card-header">
                                            <div>
                                                <h3 className="building-card-name">
                                                    {building.name}
                                                </h3>

                                                <p className="building-card-type">
                                                    {building.type}
                                                </p>
                                            </div>

                                            <div
                                                className="building-score"
                                                style={{
                                                    color:
                                                        getScoreColor(
                                                            score
                                                        ),
                                                }}
                                            >
                                                {score}/100
                                            </div>
                                        </div>

                                        <p className="building-card-description">
                                            {building.description ||
                                                "No description provided."}
                                        </p>

                                        <div className="building-mini-grid">
                                            <div className="building-mini-item">
                                                🛗 Lift:{" "}
                                                <strong>
                                                    {building.lift}
                                                </strong>
                                            </div>

                                            <div className="building-mini-item">
                                                ♿ Ramp:{" "}
                                                <strong>
                                                    {building.ramp}
                                                </strong>
                                            </div>

                                            <div className="building-mini-item">
                                                🚪 Entrance:{" "}
                                                <strong>
                                                    {
                                                        building.accessibleEntrance
                                                    }
                                                </strong>
                                            </div>

                                            <div className="building-mini-item">
                                                🚻 Toilet:{" "}
                                                <strong>
                                                    {
                                                        building.accessibleToilet
                                                    }
                                                </strong>
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                marginTop: "12px",
                                                paddingTop: "11px",
                                                borderTop:
                                                    "1px solid #e2e8f0",
                                                color: "#64748b",
                                                fontSize: "12px",
                                            }}
                                        >
                                            👍{" "}
                                            {building.confirmCount ||
                                                0}{" "}
                                            confirmed
                                            {" · "}
                                            🔄{" "}
                                            {building.changedCount ||
                                                0}{" "}
                                            changed
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                    )}
                </div>
            )}

            {/* =================================================
          SELECTED BUILDING
          ================================================= */}

            {selectedBuilding && (
                <div className="building-detail-panel">
                    <div
                        style={{
                            display: "flex",
                            justifyContent:
                                "space-between",
                            gap: "15px",
                            flexWrap: "wrap",
                        }}
                    >
                        <div>
                            <p className="small-title">
                                SELECTED BUILDING
                            </p>

                            <h3
                                style={{
                                    margin:
                                        "5px 0",
                                    fontSize: "22px",
                                }}
                            >
                                {selectedBuilding.name}
                            </h3>

                            <p
                                style={{
                                    color: "#64748b",
                                    margin: 0,
                                }}
                            >
                                {selectedBuilding.type}
                            </p>
                        </div>

                        <button
                            className="secondary-button"
                            onClick={() =>
                                onSelectBuilding(null)
                            }
                        >
                            Close
                        </button>
                    </div>

                    {/* SCORE */}

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "15px",
                            marginTop: "18px",
                            padding: "15px",
                            borderRadius: "14px",
                            background:
                                "#f0fdf4",
                            border:
                                "1px solid #bbf7d0",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "30px",
                            }}
                        >
                            ♿
                        </div>

                        <div>
                            <div
                                style={{
                                    fontSize: "12px",
                                    color: "#64748b",
                                }}
                            >
                                Building accessibility
                                score
                            </div>

                            <strong
                                style={{
                                    fontSize: "24px",
                                    color: getScoreColor(
                                        getBuildingScore(
                                            selectedBuilding
                                        )
                                    ),
                                }}
                            >
                                {getBuildingScore(
                                    selectedBuilding
                                )}
                                /100
                            </strong>
                        </div>
                    </div>

                    {/* FACILITIES */}

                    <div className="building-detail-items">
                        <div className="building-detail-item">
                            🛗 Lift
                            <strong>
                                {accessibilityLabel(
                                    selectedBuilding.lift
                                )}
                            </strong>
                        </div>

                        <div className="building-detail-item">
                            ♿ Ramp
                            <strong>
                                {accessibilityLabel(
                                    selectedBuilding.ramp
                                )}
                            </strong>
                        </div>

                        <div className="building-detail-item">
                            🚪 Entrance
                            <strong>
                                {accessibilityLabel(
                                    selectedBuilding.accessibleEntrance
                                )}
                            </strong>
                        </div>

                        <div className="building-detail-item">
                            🚻 Toilet
                            <strong>
                                {accessibilityLabel(
                                    selectedBuilding.accessibleToilet
                                )}
                            </strong>
                        </div>

                        <div className="building-detail-item">
                            🅿️ Parking
                            <strong>
                                {accessibilityLabel(
                                    selectedBuilding.accessibleParking
                                )}
                            </strong>
                        </div>

                        <div className="building-detail-item">
                            🪜 Stairs
                            <strong>
                                {accessibilityLabel(
                                    selectedBuilding.stairs
                                )}
                            </strong>
                        </div>
                    </div>

                    {/* FLOOR INFO */}

                    {selectedBuilding.floorInfo && (
                        <div className="building-floor-warning">
                            <strong>
                                🏢 Floor accessibility
                            </strong>

                            <p
                                style={{
                                    margin:
                                        "7px 0 0",
                                    lineHeight: 1.5,
                                }}
                            >
                                {
                                    selectedBuilding.floorInfo
                                }
                            </p>
                        </div>
                    )}

                    {/* IMAGE */}

                    {selectedBuilding.image && (
                        <img
                            src={selectedBuilding.image}
                            alt={selectedBuilding.name}
                            style={{
                                width: "100%",
                                maxHeight: "320px",
                                objectFit: "cover",
                                borderRadius: "16px",
                                marginTop: "18px",
                            }}
                        />
                    )}

                    {/* COMMUNITY VERIFICATION */}

                    <div
                        style={{
                            marginTop: "20px",
                            paddingTop: "18px",
                            borderTop:
                                "1px solid #e2e8f0",
                        }}
                    >
                        <h4
                            style={{
                                margin:
                                    "0 0 6px",
                            }}
                        >
                            👥 Community verification
                        </h4>

                        <p
                            style={{
                                color: "#64748b",
                                fontSize: "13px",
                                margin:
                                    "0 0 13px",
                            }}
                        >
                            Help other users know whether
                            this information is still
                            accurate.
                        </p>

                        <div className="building-verification">
                            <button
                                onClick={() =>
                                    verify(
                                        selectedBuilding.id,
                                        "confirm"
                                    )
                                }
                            >
                                👍 Still accurate (
                                {selectedBuilding.confirmCount ||
                                    0}
                                )
                            </button>

                            <button
                                onClick={() =>
                                    verify(
                                        selectedBuilding.id,
                                        "changed"
                                    )
                                }
                            >
                                🔄 Information changed (
                                {selectedBuilding.changedCount ||
                                    0}
                                )
                            </button>
                        </div>

                        <p
                            style={{
                                color: "#94a3b8",
                                fontSize: "12px",
                                marginTop: "13px",
                            }}
                        >
                            Last verified:{" "}
                            {selectedBuilding.lastVerified
                                ? new Date(
                                    selectedBuilding.lastVerified
                                ).toLocaleString()
                                : "Not verified yet"}
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}