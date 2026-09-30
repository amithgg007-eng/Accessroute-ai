import { useState } from "react";

const API_URL = "http://localhost:3001";

export default function Auth({ onLogin }) {
    const [mode, setMode] = useState("login");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const endpoint =
                mode === "login"
                    ? "/api/auth/login"
                    : "/api/auth/register";

            const body =
                mode === "login"
                    ? {
                        email,
                        password,
                    }
                    : {
                        name,
                        email,
                        password,
                    };

            const response = await fetch(
                `${API_URL}${endpoint}`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify(body),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Something went wrong"
                );
            }

            if (mode === "register") {
                setSuccess(
                    "Account created successfully! You can now log in."
                );

                setMode("login");

                setName("");
                setPassword("");
            } else {
                localStorage.setItem(
                    "accessroute_user",
                    JSON.stringify(data.user)
                );

                onLogin(data.user);
            }
        } catch (err) {
            setError(
                err.message ||
                "Unable to connect to server"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">

            {/* LEFT SIDE */}

            <div className="auth-brand">

                <div className="auth-logo">
                    ♿
                </div>

                <h1>
                    AccessRoute AI
                </h1>

                <p>
                    Navigate beyond distance.
                    <br />
                    Navigate accessibility.
                </p>

                <div className="auth-features">

                    <div>
                        <span>🗺️</span>
                        <div>
                            <strong>
                                Accessibility-aware routes
                            </strong>

                            <small>
                                Find routes based on
                                real-world barriers.
                            </small>
                        </div>
                    </div>

                    <div>
                        <span>👥</span>
                        <div>
                            <strong>
                                Community powered
                            </strong>

                            <small>
                                Report and verify
                                accessibility barriers.
                            </small>
                        </div>
                    </div>

                    <div>
                        <span>🚧</span>
                        <div>
                            <strong>
                                Real-world information
                            </strong>

                            <small>
                                Help others understand
                                what's actually on the route.
                            </small>
                        </div>
                    </div>

                </div>

            </div>

            {/* RIGHT SIDE */}

            <div className="auth-card-container">

                <div className="auth-card">

                    <div className="auth-header">

                        <h2>
                            {mode === "login"
                                ? "Welcome back"
                                : "Create your account"}
                        </h2>

                        <p>
                            {mode === "login"
                                ? "Sign in to continue to AccessRoute AI"
                                : "Join the accessibility community"}
                        </p>

                    </div>

                    {/* ERROR */}

                    {error && (
                        <div className="auth-error">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* SUCCESS */}

                    {success && (
                        <div className="auth-success">
                            ✅ {success}
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                    >

                        {/* NAME */}

                        {mode === "register" && (
                            <div className="auth-field">

                                <label>
                                    Full Name
                                </label>

                                <input
                                    type="text"
                                    placeholder="Enter your name"
                                    value={name}
                                    onChange={(e) =>
                                        setName(e.target.value)
                                    }
                                    required
                                />

                            </div>
                        )}

                        {/* EMAIL */}

                        <div className="auth-field">

                            <label>
                                Email
                            </label>

                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                                required
                            />

                        </div>

                        {/* PASSWORD */}

                        <div className="auth-field">

                            <label>
                                Password
                            </label>

                            <input
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                required
                            />

                        </div>

                        {/* SUBMIT */}

                        <button
                            type="submit"
                            className="auth-submit"
                            disabled={loading}
                        >
                            {loading
                                ? "Please wait..."
                                : mode === "login"
                                    ? "Sign In →"
                                    : "Create Account →"}
                        </button>

                    </form>

                    {/* SWITCH */}

                    <div className="auth-switch">

                        {mode === "login"
                            ? "Don't have an account?"
                            : "Already have an account?"}

                        <button
                            type="button"
                            onClick={() => {
                                setMode(
                                    mode === "login"
                                        ? "register"
                                        : "login"
                                );

                                setError("");
                                setSuccess("");
                            }}
                        >
                            {mode === "login"
                                ? "Create account"
                                : "Sign in"}
                        </button>

                    </div>

                </div>

            </div>

        </div>
    );
}