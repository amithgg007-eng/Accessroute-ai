import "./App.css";

import Map from "./Map";

import Auth from "./Auth";



import {

  useState,

  useCallback,

  useEffect,

} from "react";



const API_URL = "http://localhost:3001/api";



function App() {

  /* =====================================================

     AUTHENTICATION

     ===================================================== */



  const [currentUser, setCurrentUser] = useState(() => {

    try {

      const saved = localStorage.getItem(

        "accessroute_user"

      );



      return saved ? JSON.parse(saved) : null;

    } catch {

      return null;

    }

  });



  /* =====================================================

     LOCATION + DESTINATION

     ===================================================== */



  const [userLocation, setUserLocation] =

    useState(null);



  const [destination, setDestination] =

    useState(null);



  const [destinationText, setDestinationText] =

    useState("");



  const [searching, setSearching] =

    useState(false);



  /* =====================================================

     TRAVEL MODE

     ===================================================== */



  const [travelMode, setTravelMode] =

    useState("pedestrian");



  /* =====================================================

     ROUTE INFORMATION

     ===================================================== */



  const [routeInfo, setRouteInfo] =

    useState(null);



  const [routeAlternatives, setRouteAlternatives] =

    useState([]);



  const [selectedRouteIndex, setSelectedRouteIndex] =

    useState(0);



  /* =====================================================

     ROUTE FILTERS

     ===================================================== */



  const [showFilters, setShowFilters] =

    useState(false);



  const [selectedBarrierFilters, setSelectedBarrierFilters] =

    useState([]);



  const [minimumScore, setMinimumScore] =

    useState(0);



  const [routePreference, setRoutePreference] =

    useState("accessible");



  /* =====================================================

     BARRIERS

     ===================================================== */



  const [barriers, setBarriers] =

    useState([]);



  const [loadingBarriers, setLoadingBarriers] =

    useState(true);



  const [nearbyBarriers, setNearbyBarriers] =

    useState([]);



  /* =====================================================

     REPORT BARRIER

     ===================================================== */



  const [showBarrierForm, setShowBarrierForm] =

    useState(false);



  const [reportMode, setReportMode] =

    useState(false);



  const [

    selectedReportLocation,

    setSelectedReportLocation,

  ] = useState(null);



  const [barrierType, setBarrierType] =

    useState("Stairs");



  const [

    barrierDescription,

    setBarrierDescription,

  ] = useState("");



  const [barrierImage, setBarrierImage] =

    useState(null);



  /* =====================================================

     LOAD BARRIERS

     ===================================================== */



  useEffect(() => {

    if (!currentUser) return;



    const loadBarriers = async () => {

      try {

        setLoadingBarriers(true);



        const response = await fetch(

          `${API_URL}/barriers`

        );



        if (!response.ok) {

          throw new Error(

            "Failed to load barriers"

          );

        }



        const data = await response.json();



        setBarriers(

          Array.isArray(data) ? data : []

        );

      } catch (error) {

        console.error(

          "Error loading barriers:",

          error

        );

      } finally {

        setLoadingBarriers(false);

      }

    };



    loadBarriers();

  }, [currentUser]);



  /* =====================================================

     BARRIER SEVERITY

     ===================================================== */



  const getBarrierSeverity = (type) => {

    if (type === "Stairs") return "Critical";



    if (type === "Missing Ramp")

      return "High";



    if (type === "Construction")

      return "High";



    if (type === "Broken Footpath")

      return "Medium";



    return "Low";

  };



  const getSeverityPenalty = (severity) => {

    if (severity === "Critical") return 25;



    if (severity === "High") return 20;



    if (severity === "Medium") return 10;



    return 5;

  };



  /* =====================================================

     ACCESSIBILITY SCORE

     ===================================================== */



  const calculateAccessibilityScore = () => {

    if (!routeInfo) {

      return null;

    }



    let score = 100;



    nearbyBarriers.forEach((barrier) => {

      const severity =

        barrier.severity ||

        getBarrierSeverity(

          barrier.type

        );



      score -= getSeverityPenalty(

        severity

      );

    });



    return Math.max(

      0,

      Math.min(100, score)

    );

  };



  const accessibilityScore =

    calculateAccessibilityScore();



  /* =====================================================

     SCORE DESCRIPTION

     ===================================================== */



  const getScoreDescription = () => {

    if (accessibilityScore === null) {

      return "Calculate a route first";

    }



    if (accessibilityScore >= 80) {

      return "Highly accessible";

    }



    if (accessibilityScore >= 60) {

      return "Some barriers detected";

    }



    if (accessibilityScore >= 40) {

      return "Difficult route";

    }



    return "Major accessibility issues";

  };



  /* =====================================================

     ROUTE INFORMATION CALLBACK

     ===================================================== */



  const handleRouteInfo = useCallback(

    (info) => {

      setRouteInfo(info);



      if (info?.nearbyBarriers) {

        setNearbyBarriers(

          info.nearbyBarriers

        );

      }

    },

    []

  );



  /* =====================================================

     ROUTE ALTERNATIVES CALLBACK

     ===================================================== */



  const handleRouteAlternatives =

    useCallback((routes) => {

      if (

        !Array.isArray(routes) ||

        routes.length === 0

      ) {

        setRouteAlternatives([]);

        setSelectedRouteIndex(0);

        return;

      }



      setRouteAlternatives(routes);



      setSelectedRouteIndex(0);



      const firstRoute = routes[0];



      const nearby =

        firstRoute.nearbyBarriers ||

        firstRoute.barriers ||

        [];



      setNearbyBarriers(nearby);



      setRouteInfo({

        distance:

          Number(firstRoute.distance) || 0,



        duration:

          Number(firstRoute.duration) || 0,



        nearbyBarriers: nearby,

      });

    }, []);



  /* =====================================================

     SELECT ROUTE

     ===================================================== */



  const selectRoute = (index) => {

    const route =

      routeAlternatives[index];



    if (!route) return;



    const nearby =

      route.nearbyBarriers ||

      route.barriers ||

      [];



    setSelectedRouteIndex(index);



    setNearbyBarriers(nearby);



    setRouteInfo({

      distance:

        Number(route.distance) || 0,



      duration:

        Number(route.duration) || 0,



      nearbyBarriers: nearby,

    });

  };



  /* =====================================================

     ROUTE SCORE

     ===================================================== */



  const getRouteScore = (route) => {

    const nearby =

      route.nearbyBarriers ||

      route.barriers ||

      [];



    const penalty = nearby.reduce(

      (total, barrier) => {

        const severity =

          barrier.severity ||

          getBarrierSeverity(

            barrier.type

          );



        return (

          total +

          getSeverityPenalty(severity)

        );

      },

      0

    );



    return Math.round(

      route.score ??

      route.accessibilityScore ??

      route.accessibility_score ??

      Math.max(

        0,

        Math.min(100, 100 - penalty)

      )

    );

  };



  /* =====================================================

     FILTER ROUTES

     ===================================================== */



  const getFilteredRoutes = () => {

    return routeAlternatives

      .map((route, index) => ({

        route,

        index,



        nearby:

          route.nearbyBarriers ||

          route.barriers ||

          [],



        score: getRouteScore(route),

      }))



      .filter(

        ({ score, nearby }) => {

          if (score < minimumScore) {

            return false;

          }



          if (

            selectedBarrierFilters.length ===

            0

          ) {

            return true;

          }



          const hasAvoidedBarrier =

            nearby.some((barrier) =>

              selectedBarrierFilters.includes(

                barrier.type

              )

            );



          return !hasAvoidedBarrier;

        }

      )



      .sort((a, b) => {

        if (

          routePreference === "shortest"

        ) {

          return (

            Number(

              a.route.distance || 0

            ) -

            Number(

              b.route.distance || 0

            )

          );

        }



        if (

          routePreference === "fastest"

        ) {

          return (

            Number(

              a.route.duration || 0

            ) -

            Number(

              b.route.duration || 0

            )

          );

        }



        return b.score - a.score;

      });

  };



  const filteredRoutes =

    getFilteredRoutes();



  /* =====================================================

     TOGGLE BARRIER FILTER

     ===================================================== */



  const toggleBarrierFilter = (type) => {

    setSelectedBarrierFilters(

      (current) =>

        current.includes(type)

          ? current.filter(

            (item) => item !== type

          )

          : [...current, type]

    );

  };



  /* =====================================================

     CLEAR FILTERS

     ===================================================== */



  const clearRouteFilters = () => {

    setSelectedBarrierFilters([]);

    setMinimumScore(0);

    setRoutePreference("accessible");

  };



  /* =====================================================

     APPLY FILTERS

     ===================================================== */



  const applyRouteFilters = () => {

    const routes =

      getFilteredRoutes();



    if (routes.length > 0) {

      selectRoute(

        routes[0].index

      );

    }



    setShowFilters(false);

  };



  /* =====================================================

     USE MY LOCATION

     ===================================================== */



  const getUserLocation = () => {

    if (!navigator.geolocation) {

      alert(

        "Geolocation is not supported by your browser."

      );



      return;

    }



    navigator.geolocation.getCurrentPosition(

      (position) => {

        const latitude =

          position.coords.latitude;



        const longitude =

          position.coords.longitude;



        setUserLocation([

          latitude,

          longitude,

        ]);

      },



      () => {

        alert(

          "Unable to get your location. Please allow location access."

        );

      },



      {

        enableHighAccuracy: true,

        timeout: 10000,

        maximumAge: 0,

      }

    );

  };



  /* =====================================================

     SEARCH DESTINATION

     ===================================================== */



  const searchDestination = async () => {

    if (!destinationText.trim()) {

      alert(

        "Please enter a destination."

      );



      return;

    }



    try {

      setSearching(true);



      const response = await fetch(

        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(

          destinationText

        )}&limit=1`

      );



      const data =

        await response.json();



      if (!data.length) {

        alert(

          "Destination not found. Try another place."

        );



        return;

      }



      const latitude =

        parseFloat(data[0].lat);



      const longitude =

        parseFloat(data[0].lon);



      setDestination([

        latitude,

        longitude,

      ]);



      setRouteInfo(null);

      setRouteAlternatives([]);

      setSelectedRouteIndex(0);

      setNearbyBarriers([]);



    } catch (error) {

      console.error(error);



      alert(

        "Something went wrong while searching."

      );

    } finally {

      setSearching(false);

    }

  };



  /* =====================================================

     ENTER KEY SEARCH

     ===================================================== */



  const handleKeyDown = (event) => {

    if (event.key === "Enter") {

      searchDestination();

    }

  };



  /* =====================================================

     START BARRIER REPORT

     ===================================================== */



  const startBarrierReport = () => {

    setSelectedReportLocation(null);



    setShowBarrierForm(false);



    setReportMode(true);



    document

      .getElementById("map")

      ?.scrollIntoView({

        behavior: "smooth",

      });

  };



  /* =====================================================

     MAP LOCATION SELECTED

     ===================================================== */



  const handleLocationSelect =

    (location) => {

      setSelectedReportLocation(

        location

      );



      setReportMode(false);



      setShowBarrierForm(true);

    };



  /* =====================================================

     IMAGE SELECT

     ===================================================== */



  const handleImageChange = (event) => {

    const file = event.target.files?.[0];



    if (!file) return;



    if (!file.type.startsWith("image/")) {

      alert("Please select an image file.");

      event.target.value = "";

      return;

    }



    // Keep Base64 uploads reasonably small for SQLite/JSON storage.

    if (file.size > 5 * 1024 * 1024) {

      alert("Please choose an image smaller than 5 MB.");

      event.target.value = "";

      return;

    }



    setBarrierImage(file);

  };



  /* =====================================================

     IMAGE → BASE64

     ===================================================== */



  const convertImageToBase64 =

    (file) => {

      return new Promise(

        (resolve, reject) => {

          const reader =

            new FileReader();



          reader.onload = () =>

            resolve(

              reader.result

            );



          reader.onerror =

            reject;



          reader.readAsDataURL(file);

        }

      );

    };



  /* =====================================================

     SUBMIT BARRIER REPORT

     ===================================================== */



  const submitBarrierReport =

    async () => {

      if (

        !selectedReportLocation

      ) {

        alert(

          "Please select the exact barrier location on the map."

        );



        setShowBarrierForm(false);

        setReportMode(true);



        return;

      }



      try {

        let imageBase64 = null;



        if (barrierImage) {

          imageBase64 =

            await convertImageToBase64(

              barrierImage

            );

        }



        const newBarrier = {

          type: barrierType,



          description:

            barrierDescription.trim() ||

            "No description provided.",



          location:

            selectedReportLocation,



          latitude:

            selectedReportLocation[0],



          longitude:

            selectedReportLocation[1],



          image: imageBase64,



          severity:

            getBarrierSeverity(

              barrierType

            ),

        };



        const response =

          await fetch(

            `${API_URL}/barriers`,

            {

              method: "POST",



              headers: {

                "Content-Type":

                  "application/json",

              },



              body: JSON.stringify(

                newBarrier

              ),

            }

          );



        if (!response.ok) {

          let message = "Failed to save barrier";

          try {

            const errorData = await response.json();

            message = errorData.error || message;

          } catch {

            // Keep the default message if the response is not JSON.

          }

          throw new Error(message);

        }



        const savedBarrier =

          await response.json();



        setBarriers(

          (previous) => [

            savedBarrier,

            ...previous,

          ]

        );



        setBarrierType("Stairs");



        setBarrierDescription("");



        setBarrierImage(null);



        setSelectedReportLocation(

          null

        );



        setReportMode(false);



        setShowBarrierForm(false);



        alert(

          "Barrier saved successfully! 🚧"

        );

      } catch (error) {

        console.error(

          "Error saving barrier:",

          error

        );



        alert(

          `Could not save the barrier. ${error.message || "Make sure the backend is running."}`

        );

      }

    };



  /* =====================================================

     CANCEL REPORT

     ===================================================== */



  const cancelBarrierReport = () => {

    setShowBarrierForm(false);



    setReportMode(false);



    setSelectedReportLocation(null);



    setBarrierDescription("");



    setBarrierImage(null);



    setBarrierType("Stairs");

  };



  /* =====================================================

     MARK BARRIER FIXED

     ===================================================== */



  const handleBarrierFixed =

    async (barrierId) => {

      try {

        const response =

          await fetch(

            `${API_URL}/barriers/${barrierId}/fixed`,

            {

              method: "PATCH",

            }

          );



        if (!response.ok) {

          throw new Error(

            "Failed to update barrier"

          );

        }



        setBarriers(

          (previous) =>

            previous.filter(

              (barrier) =>

                barrier.id !==

                barrierId

            )

        );



        alert(

          "Barrier marked as fixed! ✅"

        );

      } catch (error) {

        console.error(error);



        alert(

          "Could not mark the barrier as fixed."

        );

      }

    };



  /* =====================================================

     NEARBY BARRIERS

     ===================================================== */



  const handleNearbyBarriers =

    useCallback((items) => {

      setNearbyBarriers(

        Array.isArray(items)

          ? items

          : []

      );

    }, []);



  /* =====================================================

     LOGOUT

     ===================================================== */



  const handleLogout = () => {

    localStorage.removeItem(

      "accessroute_user"

    );



    setCurrentUser(null);

  };



  /* =====================================================

     LOGIN PAGE

     ===================================================== */



  if (!currentUser) {

    return (

      <Auth

        onLogin={(user) => {

          localStorage.setItem(

            "accessroute_user",

            JSON.stringify(user)

          );



          setCurrentUser(user);

        }}

      />

    );

  }



  /* =====================================================

     MAIN UI

     ===================================================== */



  return (

    <div className="app">



      {/* =================================================

          NAVBAR

          ================================================= */}



      <header className="navbar">



        <div className="logo">



          <span className="logo-icon">

            ♿

          </span>



          <span>

            AccessRoute AI

          </span>



        </div>



        <nav>



          <a href="#home">

            Home

          </a>



          <a href="#map">

            Explore Routes

          </a>



          <a href="#report">

            Report Barrier

          </a>



        </nav>



        <div

          style={{

            display: "flex",

            alignItems: "center",

            gap: "10px",

          }}

        >



          <button

            className="location-btn"

            onClick={

              getUserLocation

            }

          >

            📍 Use My Location

          </button>



          <button

            className="location-btn"

            onClick={

              handleLogout

            }

          >

            Logout

          </button>



        </div>



      </header>



      <main>



        {/* =================================================

            HERO

            ================================================= */}



        <section

          className="hero"

          id="home"

        >



          <div className="hero-content">



            <div className="badge">

              AI-POWERED ACCESSIBILITY

              NAVIGATION

            </div>



            <h1>

              Find a route you can{" "}

              <span>

                actually use.

              </span>

            </h1>



            <p>

              AccessRoute AI helps

              people find safer and

              more accessible routes

              using community-reported

              accessibility barriers.

            </p>



            {/* SEARCH */}



            <div

              style={{

                marginTop: "25px",

                display: "flex",

                gap: "10px",

                flexWrap: "wrap",

              }}

            >



              <input

                type="text"

                placeholder="Where do you want to go?"

                value={destinationText}

                onChange={(event) =>

                  setDestinationText(

                    event.target.value

                  )

                }

                onKeyDown={

                  handleKeyDown

                }

                style={{

                  flex: "1",

                  minWidth: "250px",

                  padding: "14px 16px",

                  border:

                    "1px solid #cbd5e1",

                  borderRadius: "12px",

                  fontSize: "15px",

                  outline: "none",

                }}

              />



              <button

                className="location-btn"

                onClick={

                  searchDestination

                }

                disabled={searching}

              >

                {searching

                  ? "Searching..."

                  : "🔎 Search Route"}

              </button>



            </div>



            {/* FEATURES */}



            <div

              className="hero-features"

              style={{

                marginTop: "25px",

              }}

            >



              <div>

                <strong>

                  ♿

                </strong>



                <span>

                  Accessibility-aware

                  routing

                </span>

              </div>



              <div>

                <strong>

                  🤖

                </strong>



                <span>

                  AI-ready barrier

                  analysis

                </span>

              </div>



              <div>

                <strong>

                  🗺️

                </strong>



                <span>

                  Smart route

                  alternatives

                </span>

              </div>



              <div>

                <strong>

                  👥

                </strong>



                <span>

                  Community reports

                </span>

              </div>



            </div>



          </div>



        </section>



        {/* =================================================

            MAP

            ================================================= */}



        <section

          className="map-section"

          id="map"

        >



          <div className="section-heading">



            <div>



              <p className="small-title">

                LIVE ACCESSIBILITY MAP

              </p>



              <h2>

                Explore accessible

                routes

              </h2>



            </div>



          </div>



          {/* TRAVEL MODE */}



          <div

            style={{

              marginBottom: "16px",

              padding: "14px 16px",

              background: "#ffffff",

              border:

                "1px solid #dbe7e2",

              borderRadius: "14px",

            }}

          >



            <strong

              style={{

                display: "block",

                marginBottom: "10px",

              }}

            >

              🚗 Travel mode

            </strong>



            <div

              style={{

                display: "flex",

                gap: "8px",

                flexWrap: "wrap",

              }}

            >



              {[

                {

                  value: "pedestrian",

                  label:

                    "🚶 Walking",

                },

                {

                  value: "bicycle",

                  label:

                    "🚲 Bike",

                },

                {

                  value: "auto",

                  label:

                    "🚗 Car",

                },

              ].map((mode) => {



                const selected =

                  travelMode ===

                  mode.value;



                return (

                  <button

                    key={mode.value}

                    type="button"

                    onClick={() =>

                      setTravelMode(

                        mode.value

                      )

                    }

                    style={{

                      padding:

                        "10px 14px",

                      borderRadius:

                        "10px",

                      border: selected

                        ? "2px solid #15803d"

                        : "1px solid #cbd5e1",

                      background:

                        selected

                          ? "#f0fdf4"

                          : "#ffffff",

                      color: selected

                        ? "#166534"

                        : "#334155",

                      cursor:

                        "pointer",

                      fontWeight:

                        selected

                          ? "800"

                          : "600",

                    }}

                  >

                    {mode.label}

                  </button>

                );

              })}



            </div>



          </div>



          {/* FILTER BUTTON */}



          <div

            style={{

              marginBottom: "16px",

            }}

          >



            <button

              type="button"

              onClick={() =>

                setShowFilters(

                  !showFilters

                )

              }

              style={{

                padding:

                  "11px 16px",

                borderRadius:

                  "10px",

                border:

                  "1px solid #cbd5e1",

                background:

                  "#ffffff",

                cursor:

                  "pointer",

                fontWeight:

                  "700",

              }}

            >

              ⚙️{" "}

              {showFilters

                ? "Hide Route Filters"

                : "Route Filters"}

            </button>



          </div>



          {/* FILTER PANEL */}



          {showFilters && (

            <div

              style={{

                marginBottom: "18px",

                padding: "18px",

                background:

                  "#ffffff",

                border:

                  "1px solid #dbe7e2",

                borderRadius:

                  "14px",

              }}

            >



              <strong>

                🚧 Avoid barrier types

              </strong>



              <div

                style={{

                  display: "flex",

                  gap: "8px",

                  flexWrap: "wrap",

                  marginTop: "10px",

                }}

              >



                {[

                  "Stairs",

                  "Broken Footpath",

                  "Missing Ramp",

                  "Construction",

                ].map((type) => {



                  const selected =

                    selectedBarrierFilters.includes(

                      type

                    );



                  return (

                    <button

                      key={type}

                      type="button"

                      onClick={() =>

                        toggleBarrierFilter(

                          type

                        )

                      }

                      style={{

                        padding:

                          "8px 12px",

                        borderRadius:

                          "9px",

                        border:

                          selected

                            ? "2px solid #15803d"

                            : "1px solid #cbd5e1",

                        background:

                          selected

                            ? "#f0fdf4"

                            : "#ffffff",

                        color:

                          selected

                            ? "#166534"

                            : "#334155",

                        cursor:

                          "pointer",

                      }}

                    >

                      {type}

                    </button>

                  );

                })}



              </div>



              <strong

                style={{

                  display: "block",

                  margin:

                    "18px 0 10px",

                }}

              >

                📊 Minimum accessibility

                score

              </strong>



              <select

                value={minimumScore}

                onChange={(event) =>

                  setMinimumScore(

                    Number(

                      event.target.value

                    )

                  )

                }

                style={{

                  width: "100%",

                  padding:

                    "11px 12px",

                  border:

                    "1px solid #cbd5e1",

                  borderRadius:

                    "10px",

                  background:

                    "#ffffff",

                }}

              >

                <option value={0}>

                  Any score

                </option>



                <option value={40}>

                  40+

                </option>



                <option value={60}>

                  60+

                </option>



                <option value={80}>

                  80+

                </option>

              </select>



              <strong

                style={{

                  display: "block",

                  margin:

                    "18px 0 10px",

                }}

              >

                🧭 Route preference

              </strong>



              <select

                value={

                  routePreference

                }

                onChange={(event) =>

                  setRoutePreference(

                    event.target.value

                  )

                }

                style={{

                  width: "100%",

                  padding:

                    "11px 12px",

                  border:

                    "1px solid #cbd5e1",

                  borderRadius:

                    "10px",

                  background:

                    "#ffffff",

                }}

              >



                <option value="accessible">

                  Most accessible

                </option>



                <option value="shortest">

                  Shortest distance

                </option>



                <option value="fastest">

                  Fastest

                </option>



              </select>



              <div

                style={{

                  display: "flex",

                  justifyContent:

                    "flex-end",

                  gap: "10px",

                  marginTop: "20px",

                }}

              >



                <button

                  type="button"

                  onClick={

                    clearRouteFilters

                  }

                  style={{

                    padding:

                      "11px 16px",

                    borderRadius:

                      "10px",

                    border:

                      "1px solid #cbd5e1",

                    background:

                      "#ffffff",

                    cursor:

                      "pointer",

                    fontWeight:

                      "700",

                  }}

                >

                  Clear

                </button>



                <button

                  type="button"

                  onClick={

                    applyRouteFilters

                  }

                  style={{

                    padding:

                      "11px 18px",

                    borderRadius:

                      "10px",

                    border: "none",

                    background:

                      "#15803d",

                    color:

                      "#ffffff",

                    cursor:

                      "pointer",

                    fontWeight:

                      "700",

                  }}

                >

                  Apply Filters

                </button>



              </div>



              {routeAlternatives.length >

                0 &&

                filteredRoutes.length ===

                0 && (

                  <div

                    style={{

                      marginTop: "16px",

                      padding:

                        "12px 14px",

                      borderRadius:

                        "10px",

                      background:

                        "#fff7ed",

                      color:

                        "#9a3412",

                      fontSize:

                        "14px",

                    }}

                  >

                    No available route

                    matches these

                    filters.

                  </div>

                )}



            </div>

          )}



          {/* REPORT MODE MESSAGE */}



          {reportMode && (

            <div

              style={{

                marginBottom:

                  "12px",

                padding:

                  "14px 18px",

                borderRadius:

                  "12px",

                background:

                  "#e8f7ef",

                border:

                  "1px solid #b7e4c7",

                color:

                  "#166534",

                fontWeight:

                  "600",

              }}

            >

              📍 Click the exact

              location of the

              barrier on the map.

            </div>

          )}



          {/* MAP */}



          <div

            className="map-container"

            style={{

              position:

                "relative",

            }}

          >



            <Map

              userLocation={

                userLocation

              }



              destination={

                destination

              }



              travelMode={

                travelMode

              }



              onRouteInfo={

                handleRouteInfo

              }



              onRouteAlternatives={

                handleRouteAlternatives

              }



              barriers={

                barriers

              }



              onBarrierFixed={

                handleBarrierFixed

              }



              reportMode={

                reportMode

              }



              selectedReportLocation={

                selectedReportLocation

              }



              onLocationSelect={

                handleLocationSelect

              }



              onNearbyBarriers={

                handleNearbyBarriers

              }

            />



            <div className="map-status">



              {reportMode

                ? "📍 Click the map to choose barrier location"

                : destination

                  ? "🟢 Destination selected"

                  : userLocation

                    ? "📍 Your location detected"

                    : "🟢 Ready to calculate an accessible route"}



            </div>



          </div>



        </section>



        {/* =================================================

            ROUTE INFORMATION

            ================================================= */}



        <section

          className="report-section"

        >



          <div className="section-heading">



            <div>



              <p className="small-title">

                ACCESSIBILITY REPORT

              </p>



              <h2>

                Route information

              </h2>



            </div>



          </div>



          {/* ACCESSIBILITY SCORE */}



          <div

            style={{

              marginBottom:

                "24px",

              padding:

                "20px",

              background:

                "#ffffff",

              border:

                "1px solid #dbe7e2",

              borderRadius:

                "16px",

            }}

          >



            <div

              style={{

                display:

                  "flex",

                justifyContent:

                  "space-between",

                alignItems:

                  "center",

              }}

            >



              <div>



                <p

                  style={{

                    margin:

                      "0 0 5px",

                    color:

                      "#64748b",

                  }}

                >

                  Accessibility

                  Score

                </p>



                <strong

                  style={{

                    fontSize:

                      "34px",

                    color:

                      "#15803d",

                  }}

                >

                  {accessibilityScore ??

                    100}

                  /100

                </strong>



              </div>



              <div

                style={{

                  fontWeight:

                    "700",

                  color:

                    "#166534",

                }}

              >

                {getScoreDescription()}

              </div>



            </div>



            <div

              style={{

                height: "10px",

                marginTop:

                  "15px",

                borderRadius:

                  "20px",

                background:

                  "#e2e8f0",

                overflow:

                  "hidden",

              }}

            >



              <div

                style={{

                  width: `${accessibilityScore ??

                    100

                    }%`,

                  height: "100%",

                  background:

                    "#15803d",

                  borderRadius:

                    "20px",

                }}

              />



            </div>



          </div>



          {/* AVAILABLE ROUTES */}



          {routeAlternatives.length >

            0 && (

              <div

                style={{

                  marginBottom:

                    "24px",

                  padding:

                    "18px",

                  background:

                    "#ffffff",

                  border:

                    "1px solid #dbe7e2",

                  borderRadius:

                    "16px",

                }}

              >



                <h3>

                  🗺️ Available Routes

                </h3>



                <div

                  style={{

                    display:

                      "grid",

                    gridTemplateColumns:

                      "repeat(auto-fit, minmax(220px, 1fr))",

                    gap: "12px",

                  }}

                >



                  {routeAlternatives.map(

                    (route, index) => {



                      const isSelected =

                        selectedRouteIndex ===

                        index;



                      const nearby =

                        route.nearbyBarriers ||

                        route.barriers ||

                        [];



                      const score =

                        getRouteScore(

                          route

                        );



                      return (

                        <button

                          key={index}

                          type="button"

                          onClick={() =>

                            selectRoute(

                              index

                            )

                          }

                          style={{

                            textAlign:

                              "left",

                            padding:

                              "16px",

                            borderRadius:

                              "12px",

                            border:

                              isSelected

                                ? "2px solid #15803d"

                                : "1px solid #dbe7e2",

                            background:

                              isSelected

                                ? "#f0fdf4"

                                : "#ffffff",

                            cursor:

                              "pointer",

                          }}

                        >



                          <strong>

                            Route{" "}

                            {index + 1}

                          </strong>



                          <div

                            style={{

                              marginTop:

                                "8px",

                              color:

                                "#64748b",

                            }}

                          >

                            📏{" "}

                            {(

                              Number(

                                route.distance ||

                                0

                              ) / 1000

                            ).toFixed(

                              2

                            )}{" "}

                            km

                          </div>



                          <div

                            style={{

                              marginTop:

                                "5px",

                              color:

                                "#64748b",

                            }}

                          >

                            ⏱️{" "}

                            {Math.round(

                              Number(

                                route.duration ||

                                0

                              ) / 60

                            )}{" "}

                            min

                          </div>



                          <div

                            style={{

                              marginTop:

                                "5px",

                              color:

                                "#166534",

                              fontWeight:

                                "800",

                            }}

                          >

                            ♿ {score}/100

                          </div>



                          <div

                            style={{

                              marginTop:

                                "5px",

                              color:

                                nearby.length >

                                  0

                                  ? "#b45309"

                                  : "#166534",

                            }}

                          >

                            🚧{" "}

                            {

                              nearby.length

                            }{" "}

                            barrier

                            {nearby.length !==

                              1

                              ? "s"

                              : ""}

                          </div>



                        </button>

                      );

                    }

                  )}



                </div>



              </div>

            )}



          {/* SELECTED ROUTE */}



          <div

            style={{

              display:

                "grid",

              gridTemplateColumns:

                "repeat(auto-fit, minmax(180px, 1fr))",

              gap: "15px",

            }}

          >



            <div

              className="route-card"

            >



              <span>

                📏 Distance

              </span>



              <strong>

                {routeInfo

                  ? `${(

                    Number(

                      routeInfo.distance ||

                      0

                    ) / 1000

                  ).toFixed(

                    2

                  )} km`

                  : "--"}

              </strong>



            </div>



            <div

              className="route-card"

            >



              <span>

                ⏱️ Time

              </span>



              <strong>

                {routeInfo

                  ? `${Math.round(

                    Number(

                      routeInfo.duration ||

                      0

                    ) / 60

                  )} min`

                  : "--"}

              </strong>



            </div>



            <div

              className="route-card"

            >



              <span>

                🚧 Route Barriers

              </span>



              <strong>

                {nearbyBarriers.length}

              </strong>



            </div>



            <div

              className="route-card"

            >



              <span>

                🚗 Mode

              </span>



              <strong>

                {travelMode ===

                  "pedestrian"

                  ? "Walking"

                  : travelMode ===

                    "bicycle"

                    ? "Bike"

                    : "Car"}

              </strong>



            </div>



          </div>



          {/* ROUTE BARRIERS */}



          <div

            style={{

              marginTop:

                "20px",

            }}

          >



            {nearbyBarriers.length >

              0 ? (

              <div

                style={{

                  padding:

                    "16px",

                  borderRadius:

                    "12px",

                  background:

                    "#fff7ed",

                  border:

                    "1px solid #fed7aa",

                  color:

                    "#9a3412",

                }}

              >

                ⚠️{" "}

                {

                  nearbyBarriers.length

                }{" "}

                accessibility

                barrier

                {nearbyBarriers.length !==

                  1

                  ? "s"

                  : ""}{" "}

                detected near

                this route.

              </div>

            ) : (

              <div

                style={{

                  padding:

                    "16px",

                  borderRadius:

                    "12px",

                  background:

                    "#f0fdf4",

                  border:

                    "1px solid #bbf7d0",

                  color:

                    "#166534",

                }}

              >

                ✅ No reported

                barriers near

                this route.

              </div>

            )}



          </div>



        </section>



        {/* =================================================

            COMMUNITY BARRIERS

            ================================================= */}



        <section

          className="report-section"

          id="report"

        >



          <div className="section-heading">



            <div>



              <p className="small-title">

                COMMUNITY DATA

              </p>



              <h2>

                Reported accessibility

                barriers

              </h2>



            </div>



            <button

              className="location-btn"

              onClick={

                startBarrierReport

              }

            >

              🚧 Report Barrier

            </button>



          </div>



          {/* REPORT INSTRUCTION */}



          {reportMode && (

            <div

              style={{

                marginBottom:

                  "18px",

                padding:

                  "15px",

                background:

                  "#e8f7ef",

                border:

                  "1px solid #b7e4c7",

                borderRadius:

                  "12px",

                color:

                  "#166534",

                fontWeight:

                  "700",

              }}

            >

              📍 Click the exact

              location of the

              barrier on the map.

            </div>

          )}



          {loadingBarriers ? (

            <div>

              Loading community

              reports...

            </div>

          ) : barriers.length ===

            0 ? (

            <div

              style={{

                padding:

                  "30px",

                textAlign:

                  "center",

                background:

                  "#ffffff",

                border:

                  "1px solid #dbe7e2",

                borderRadius:

                  "14px",

              }}

            >

              📍 No barriers

              reported yet.

            </div>

          ) : (

            <div

              style={{

                display:

                  "grid",

                gridTemplateColumns:

                  "repeat(auto-fit, minmax(250px, 1fr))",

                gap: "15px",

              }}

            >



              {barriers.map(

                (barrier) => {



                  const severity =

                    barrier.severity ||

                    getBarrierSeverity(

                      barrier.type

                    );



                  return (

                    <div

                      key={

                        barrier.id

                      }

                      className="barrier-card"

                    >



                      <div

                        style={{

                          display:

                            "flex",

                          justifyContent:

                            "space-between",

                          gap: "10px",

                        }}

                      >



                        <strong>

                          {barrier.type}

                        </strong>



                        <span

                          className={`severity-badge severity-${severity.toLowerCase()}`}

                        >

                          {severity}

                        </span>



                      </div>



                      <p>

                        {barrier.description ||

                          "No description provided."}

                      </p>



                      <div

                        style={{

                          marginTop:

                            "10px",

                          color:

                            "#64748b",

                          fontSize:

                            "13px",

                        }}

                      >

                        👥{" "}

                        {barrier.confirm_count ||

                          0}{" "}

                        confirmations

                      </div>



                      <button

                        className="secondary-button"

                        style={{

                          marginTop:

                            "10px",

                        }}

                        onClick={() =>

                          handleBarrierFixed(

                            barrier.id

                          )

                        }

                      >

                        ✅ Mark as Fixed

                      </button>



                    </div>

                  );

                }

              )}



            </div>

          )}



        </section>



        {/* =================================================

            BARRIER FORM

            ================================================= */}



        {showBarrierForm && (

          <div

            className="modal-overlay"

          >



            <div className="modal">



              <div className="modal-header">



                <h2>

                  🚧 Report Barrier

                </h2>



                <button

                  className="modal-close"

                  onClick={

                    cancelBarrierReport

                  }

                >

                  ×

                </button>



              </div>



              {/* LOCATION */}



              <div

                style={{

                  marginBottom:

                    "16px",

                  padding:

                    "12px",

                  background:

                    "#f8fafc",

                  borderRadius:

                    "10px",

                }}

              >



                {selectedReportLocation ? (

                  <>

                    <div>

                      <strong>

                        📍 Selected

                        location

                      </strong>

                    </div>



                    <div>

                      Latitude:{" "}

                      {Number(selectedReportLocation[0]).toFixed(

                        6

                      )}

                    </div>



                    <div>

                      Longitude:{" "}

                      {Number(selectedReportLocation[1]).toFixed(

                        6

                      )}

                    </div>

                  </>

                ) : (

                  <strong>

                    📍 Select a location

                    on the map first.

                  </strong>

                )}



              </div>



              {/* TYPE */}



              <label>

                Barrier Type

              </label>



              <select

                value={barrierType}

                onChange={(event) =>

                  setBarrierType(

                    event.target.value

                  )

                }

                style={{

                  width: "100%",

                  margin:

                    "7px 0 15px",

                  padding:

                    "11px",

                  border:

                    "1px solid #cbd5e1",

                  borderRadius:

                    "10px",

                }}

              >



                <option value="Stairs">

                  🪜 Stairs

                </option>



                <option value="Broken Footpath">

                  🛣️ Broken Footpath

                </option>



                <option value="Missing Ramp">

                  ♿ Missing Ramp

                </option>



                <option value="Construction">

                  🚧 Construction

                </option>



                <option value="Other">

                  Other

                </option>



              </select>



              {/* SEVERITY */}



              <label>

                Severity

              </label>



              <div

                style={{

                  margin:

                    "7px 0 15px",

                  padding:

                    "10px",

                  borderRadius:

                    "9px",

                  background:

                    "#f8fafc",

                  fontWeight:

                    "700",

                }}

              >

                {getBarrierSeverity(

                  barrierType

                )}

              </div>



              {/* DESCRIPTION */}



              <label>

                Description

              </label>



              <textarea

                placeholder="Describe the accessibility problem..."

                value={

                  barrierDescription

                }

                onChange={(event) =>

                  setBarrierDescription(

                    event.target

                      .value

                  )

                }

                style={{

                  width:

                    "100%",

                  minHeight:

                    "100px",

                  margin:

                    "7px 0 15px",

                  padding:

                    "11px",

                  border:

                    "1px solid #cbd5e1",

                  borderRadius:

                    "10px",

                  resize:

                    "vertical",

                }}

              />



              {/* PHOTO */}



              <label>

                Photo

              </label>



              <input

                type="file"

                accept="image/*"

                onChange={

                  handleImageChange

                }

                style={{

                  display:

                    "block",

                  marginTop:

                    "7px",

                  marginBottom:

                    "10px",

                }}

              />



              {barrierImage && (

                <>

                  <p>

                    📷{" "}

                    {barrierImage.name}

                  </p>



                  <img

                    src={URL.createObjectURL(barrierImage)}

                    alt="Barrier preview"

                    style={{

                      width: "100%",

                      maxHeight: "220px",

                      objectFit: "cover",

                      borderRadius: "12px",

                      marginTop: "8px",

                      border: "1px solid #dbe7e2",

                    }}

                  />

                </>

              )}



              {/* ACTIONS */}



              <div

                className="modal-actions"

              >



                <button

                  className="cancel-btn"

                  onClick={

                    cancelBarrierReport

                  }

                >

                  Cancel

                </button>



                <button

                  className="submit-btn"

                  onClick={

                    submitBarrierReport

                  }

                  disabled={

                    !selectedReportLocation

                  }

                  style={{

                    opacity:

                      selectedReportLocation

                        ? 1

                        : 0.5,

                    cursor:

                      selectedReportLocation

                        ? "pointer"

                        : "not-allowed",

                  }}

                >

                  🚧 Submit Report

                </button>



              </div>



            </div>



          </div>

        )}



      </main>



      {/* =================================================

          FOOTER

          ================================================= */}



      <footer>



        <div className="logo">



          <span className="logo-icon">

            ♿

          </span>



          <span>

            AccessRoute AI

          </span>



        </div>



        <p>

          Making navigation more

          accessible for everyone.

        </p>



        <span>

          © 2026 AccessRoute AI

        </span>



      </footer>



    </div>

  );

}



export default App;