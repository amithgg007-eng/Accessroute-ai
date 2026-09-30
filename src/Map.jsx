import {

    MapContainer,

    TileLayer,

    Marker,

    Popup,

    Polyline,

    useMap,

    useMapEvents,

} from "react-leaflet";



import "leaflet/dist/leaflet.css";

import L from "leaflet";

import { useEffect, useState } from "react";



delete L.Icon.Default.prototype._getIconUrl;



L.Icon.Default.mergeOptions({

    iconRetinaUrl:

        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",



    iconUrl:

        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",



    shadowUrl:

        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",

});





// ======================================================

// MAP CONTROLLER

// ======================================================



function MapController({

    userLocation,

    destination,

}) {

    const map = useMap();



    useEffect(() => {

        if (userLocation && destination) {

            const bounds = L.latLngBounds([

                userLocation,

                destination,

            ]);



            map.fitBounds(bounds, {

                padding: [50, 50],

            });

        } else if (userLocation) {

            map.setView(

                userLocation,

                15

            );

        } else if (destination) {

            map.setView(

                destination,

                15

            );

        }

    }, [

        userLocation,

        destination,

        map,

    ]);



    return null;

}





// ======================================================

// MAP CLICK HANDLER

// ======================================================



function MapClickHandler({

    reportMode,

    onLocationSelect,

}) {

    useMapEvents({

        click(event) {

            if (!reportMode) {

                return;

            }



            const selectedLocation = [

                event.latlng.lat,

                event.latlng.lng,

            ];



            if (onLocationSelect) {

                onLocationSelect(

                    selectedLocation

                );

            }

        },

    });



    return null;

}





// ======================================================

// POLYLINE6 DECODER

// ======================================================



function decodePolyline6(encoded) {

    let index = 0;



    let lat = 0;

    let lng = 0;



    const coordinates = [];



    while (index < encoded.length) {

        let shift = 0;

        let result = 0;

        let byte;



        do {

            byte =

                encoded.charCodeAt(index++) -

                63;



            result |=

                (byte & 0x1f) << shift;



            shift += 5;

        } while (byte >= 0x20);



        const deltaLat =

            result & 1

                ? ~(result >> 1)

                : result >> 1;



        lat += deltaLat;



        shift = 0;

        result = 0;



        do {

            byte =

                encoded.charCodeAt(index++) -

                63;



            result |=

                (byte & 0x1f) << shift;



            shift += 5;

        } while (byte >= 0x20);



        const deltaLng =

            result & 1

                ? ~(result >> 1)

                : result >> 1;



        lng += deltaLng;



        coordinates.push([

            lat / 1000000,

            lng / 1000000,

        ]);

    }



    return coordinates;

}





// ======================================================

// DISTANCE CALCULATION

// ======================================================



function calculateDistance(

    lat1,

    lng1,

    lat2,

    lng2

) {

    const earthRadius = 6371000;



    const lat1Rad =

        (lat1 * Math.PI) / 180;



    const lat2Rad =

        (lat2 * Math.PI) / 180;



    const deltaLat =

        ((lat2 - lat1) * Math.PI) /

        180;



    const deltaLng =

        ((lng2 - lng1) * Math.PI) /

        180;



    const a =

        Math.sin(deltaLat / 2) *

        Math.sin(deltaLat / 2) +

        Math.cos(lat1Rad) *

        Math.cos(lat2Rad) *

        Math.sin(deltaLng / 2) *

        Math.sin(deltaLng / 2);



    const c =

        2 *

        Math.atan2(

            Math.sqrt(a),

            Math.sqrt(1 - a)

        );



    return earthRadius * c;

}





// ======================================================

// FIND BARRIERS NEAR ROUTE

// ======================================================



function findNearbyBarriers(

    route,

    barriers

) {

    if (

        !route ||

        route.length === 0 ||

        !barriers ||

        barriers.length === 0

    ) {

        return [];

    }



    const ROUTE_RADIUS = 100;



    return barriers.filter(

        (barrier) => {

            if (

                !barrier.location ||

                barrier.location.length !== 2

            ) {

                return false;

            }



            const barrierLat =

                Number(

                    barrier.location[0]

                );



            const barrierLng =

                Number(

                    barrier.location[1]

                );



            if (

                Number.isNaN(

                    barrierLat

                ) ||

                Number.isNaN(

                    barrierLng

                )

            ) {

                return false;

            }



            let closestDistance =

                Infinity;



            for (

                let i = 0;

                i < route.length;

                i++

            ) {

                const routePoint =

                    route[i];



                const routeLat =

                    Number(

                        routePoint[0]

                    );



                const routeLng =

                    Number(

                        routePoint[1]

                    );



                const distance =

                    calculateDistance(

                        barrierLat,

                        barrierLng,

                        routeLat,

                        routeLng

                    );



                if (

                    distance <

                    closestDistance

                ) {

                    closestDistance =

                        distance;

                }



                if (

                    closestDistance <=

                    ROUTE_RADIUS

                ) {

                    break;

                }

            }



            return (

                closestDistance <=

                ROUTE_RADIUS

            );

        }

    );

}





// ======================================================

// BARRIER SEVERITY

// ======================================================



function getBarrierSeverity(

    type

) {

    if (type === "Stairs") {

        return "Critical";

    }



    if (

        type === "Missing Ramp"

    ) {

        return "High";

    }



    if (

        type === "Construction"

    ) {

        return "High";

    }



    if (

        type ===

        "Broken Footpath"

    ) {

        return "Medium";

    }



    return "Low";

}





function getSeverityPenalty(

    severity

) {

    if (

        severity ===

        "Critical"

    ) {

        return 25;

    }



    if (

        severity === "High"

    ) {

        return 20;

    }



    if (

        severity === "Medium"

    ) {

        return 10;

    }



    return 5;

}





// ======================================================

// ACCESSIBILITY SCORE

// ======================================================



function calculateRouteScore(

    nearbyBarriers

) {

    let score = 100;



    nearbyBarriers.forEach(

        (barrier) => {

            const severity =

                barrier.severity ||

                getBarrierSeverity(

                    barrier.type

                );



            score -=

                getSeverityPenalty(

                    severity

                );

        }

    );



    return Math.max(

        0,

        Math.min(100, score)

    );

}





// ======================================================

// TRAVEL MODE LABEL

// ======================================================



function getModeLabel(

    travelMode

) {

    if (

        travelMode ===

        "bicycle"

    ) {

        return "🚲 Bike";

    }



    if (

        travelMode === "auto"

    ) {

        return "🚗 Car";

    }



    return "🚶 Walking";

}





// ======================================================

// ROUTE COLORS

// ======================================================



function getRouteColor(

    index

) {

    const colors = [

        "#15803d",

        "#2563eb",

        "#9333ea",

    ];



    return (

        colors[index] ||

        "#64748b"

    );

}





// ======================================================

// ======================================================
// ROUTE DISTANCE / TIME HELPERS
// ======================================================

function calculateRouteDistance(points) {
    if (!Array.isArray(points) || points.length < 2) {
        return 0;
    }

    const toRadians = (value) =>
        (value * Math.PI) / 180;

    const earthRadiusKm = 6371;
    let totalKm = 0;

    for (let i = 1; i < points.length; i++) {
        const [lat1, lon1] = points[i - 1];
        const [lat2, lon2] = points[i];

        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2;

        const c =
            2 *
            Math.atan2(
                Math.sqrt(a),
                Math.sqrt(1 - a)
            );

        totalKm += earthRadiusKm * c;
    }

    return totalKm * 1000;
}

function getTravelSpeedKmh(travelMode) {
    if (travelMode === "pedestrian") return 5.1;
    if (travelMode === "bicycle") return 15;
    return 40;
}

function calculateRouteDurationMinutes(
    distanceMeters,
    travelMode,
    valhallaSeconds
) {
    const distanceKm = Number(distanceMeters || 0) / 1000;
    const speedKmh = getTravelSpeedKmh(travelMode);
    const estimatedMinutes =
        (distanceKm / speedKmh) * 60;

    const valhallaMinutes =
        Number(valhallaSeconds || 0) / 60;

    if (valhallaMinutes > 0) {
        const minimumMinutes =
            travelMode === "pedestrian"
                ? Math.max(1, estimatedMinutes * 0.75)
                : Math.max(0.5, estimatedMinutes * 0.5);

        const maximumMinutes =
            Math.max(2, estimatedMinutes * 2.5);

        if (
            valhallaMinutes >= minimumMinutes &&
            valhallaMinutes <= maximumMinutes
        ) {
            return valhallaMinutes * 60;
        }
    }

    return estimatedMinutes * 60;
}


// ROUTING COMPONENT

// ======================================================



function WalkingRoute({

    userLocation,

    destination,

    barriers,

    travelMode,

    onRouteInfo,

    onNearbyBarriers,

    onRouteAlternatives,

}) {

    const [routes, setRoutes] =

        useState([]);



    const [loading, setLoading] =

        useState(false);





    useEffect(() => {

        if (

            !userLocation ||

            !destination

        ) {

            setRoutes([]);



            if (onRouteInfo) {

                onRouteInfo(null);

            }



            if (onNearbyBarriers) {

                onNearbyBarriers([]);

            }



            if (onRouteAlternatives) {

                onRouteAlternatives([]);

            }



            return;

        }



        let cancelled = false;





        const getRoute =

            async () => {

                try {

                    setLoading(true);





                    // ========================================

                    // VALHALLA COSTING OPTIONS

                    // ========================================



                    let costingOptions;



                    if (

                        travelMode ===

                        "pedestrian"

                    ) {

                        costingOptions = {

                            pedestrian: {

                                walking_speed: 5.1,

                            },

                        };

                    } else if (

                        travelMode ===

                        "bicycle"

                    ) {

                        costingOptions = {

                            bicycle: {

                                cycling_speed: 15,

                            },

                        };

                    } else {

                        costingOptions = {

                            auto: {

                                top_speed: 50,

                            },

                        };

                    }





                    // ========================================
                    // ROUTE REQUESTS
                    // ========================================

                    // Valhalla may return fewer alternates than requested.
                    // We first request official alternates, then make additional
                    // requests that avoid roads already used by accepted routes.

                    const buildCostingOptions = (variant = 0) => {
                        if (travelMode === "pedestrian") {
                            const walkingSpeeds = [5.1, 4.9, 5.3];
                            return {
                                pedestrian: {
                                    walking_speed: walkingSpeeds[variant] || 5.1,
                                },
                            };
                        }

                        if (travelMode === "bicycle") {
                            const cyclingSpeeds = [15, 14, 16];
                            return {
                                bicycle: {
                                    cycling_speed: cyclingSpeeds[variant] || 15,
                                },
                            };
                        }

                        const topSpeeds = [50, 45, 55];
                        return {
                            auto: {
                                top_speed: topSpeeds[variant] || 50,
                            },
                        };
                    };

                    const requestRoute = async (
                        excludeLocations = [],
                        variant = 0
                    ) => {
                        const body = {
                            locations: [
                                { lat: userLocation[0], lon: userLocation[1] },
                                { lat: destination[0], lon: destination[1] },
                            ],
                            costing: travelMode,
                            costing_options: buildCostingOptions(variant),
                            alternates: 2,
                            directions_options: { units: "kilometers" },
                            shape_format: "polyline6",
                        };

                        if (excludeLocations.length > 0) {
                            body.exclude_locations = excludeLocations;
                        }

                        const response = await fetch(
                            "https://valhalla1.openstreetmap.de/route",
                            {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(body),
                            }
                        );

                        const data = await response.json();

                        if (!response.ok) {
                            throw new Error(data.error || "Routing failed");
                        }

                        return [
                            data.trip,
                            ...(Array.isArray(data.alternates) ? data.alternates : []),
                        ].filter((trip) => trip?.legs?.[0]?.shape);
                    };

                    // Select road points from the middle of a route. Valhalla
                    // maps exclude_locations to the nearest road and avoids it.
                    const getExcludePoints = (route) => {
                        if (!Array.isArray(route) || route.length < 10) return [];

                        return [0.35, 0.50, 0.65]
                            .map((fraction) => route[Math.floor(route.length * fraction)])
                            .filter(Boolean)
                            .map(([lat, lon]) => ({ lat, lon }));
                    };

                    // Do not count two routes as alternatives when most of their
                    // sampled geometry lies within 35 metres of one another.
                    const routesAreTooSimilar = (candidate, existingRoutes) => {
                        if (!candidate?.length || existingRoutes.length === 0) {
                            return false;
                        }

                        const samples = 20;
                        let closeSamples = 0;

                        for (let i = 0; i < samples; i++) {
                            const index = Math.floor(
                                (i / (samples - 1)) * (candidate.length - 1)
                            );
                            const point = candidate[index];
                            let closest = Infinity;

                            for (const existing of existingRoutes) {
                                for (let j = 0; j < existing.length; j += 3) {
                                    const p = existing[j];
                                    const d = calculateDistance(
                                        point[0], point[1], p[0], p[1]
                                    );
                                    if (d < closest) closest = d;
                                    if (closest <= 20) break;
                                }
                                if (closest <= 20) break;
                            }

                            if (closest <= 35) closeSamples++;
                        }

                        return closeSamples / samples >= 0.70;
                    };

                    const acceptedTrips = [];
                    const acceptedGeometries = [];

                    // First: use Valhalla's own alternate-route support.
                    try {
                        const candidates = await requestRoute([], 0);

                        for (const trip of candidates) {
                            const shape = trip?.legs?.[0]?.shape;
                            if (!shape) continue;

                            const route = decodePolyline6(shape);
                            if (route.length < 2) continue;

                            if (!routesAreTooSimilar(route, acceptedGeometries)) {
                                acceptedTrips.push(trip);
                                acceptedGeometries.push(route);
                            }

                            if (acceptedTrips.length === 3) break;
                        }
                    } catch (error) {
                        console.warn("Initial route request failed:", error);
                    }

                    // If Valhalla did not provide three distinct routes, request
                    // additional real routes while avoiding roads already used.
                    for (
                        let attempt = 0;
                        acceptedTrips.length < 3 && attempt < 3;
                        attempt++
                    ) {
                        const excludeLocations = acceptedGeometries.flatMap(
                            (route) => getExcludePoints(route)
                        );

                        try {
                            const candidates = await requestRoute(
                                excludeLocations,
                                (attempt + 1) % 3
                            );

                            for (const trip of candidates) {
                                const shape = trip?.legs?.[0]?.shape;
                                if (!shape) continue;

                                const route = decodePolyline6(shape);
                                if (route.length < 2) continue;

                                if (routesAreTooSimilar(route, acceptedGeometries)) {
                                    continue;
                                }

                                acceptedTrips.push(trip);
                                acceptedGeometries.push(route);

                                if (acceptedTrips.length === 3) break;
                            }
                        } catch (error) {
                            console.warn(
                                `Alternative route request ${attempt + 2} failed:`,
                                error
                            );
                        }
                    }

                    const trips = acceptedTrips.slice(0, 3);

                    // ========================================
                    // PROCESS THE 3 ROUTES
                    // ========================================

                    const processedRoutes = trips
                        .slice(0, 3)
                        .map((trip, index) => {
                            const leg = trip.legs?.[0];

                            if (!leg?.shape) return null;

                            const decodedRoute = decodePolyline6(leg.shape);

                            if (!decodedRoute || decodedRoute.length < 2) {
                                return null;
                            }

                            const nearbyBarriers = findNearbyBarriers(
                                decodedRoute,
                                barriers
                            );

                            // Accurate distance from the actual route geometry (meters).
                            const distance = calculateRouteDistance(decodedRoute);

                            // Accurate route-specific travel time (seconds).
                            const duration = calculateRouteDurationMinutes(
                                distance,
                                travelMode,
                                trip.summary?.time
                            );

                            // Each route gets its own accessibility score.
                            const score = calculateRouteScore(nearbyBarriers);

                            return {
                                index,
                                route: decodedRoute,
                                distance,
                                duration,
                                nearbyBarriers,
                                score,
                                accessibilityScore: score,
                                travelMode,
                            };
                        })
                        .filter(Boolean);

                    // If two requests happen to produce identical geometry,
                    // keep the routes rather than hiding the comparison.

                    if (cancelled) {

                        return;

                    }





                    // ========================================

                    // SAVE ROUTES

                    // ========================================



                    setRoutes(

                        processedRoutes

                    );





                    if (

                        onRouteAlternatives

                    ) {

                        onRouteAlternatives(

                            processedRoutes

                        );

                    }





                    // ========================================

                    // FIRST ROUTE INFORMATION

                    // ========================================



                    const firstRoute =

                        processedRoutes[0];





                    if (firstRoute) {

                        if (

                            onNearbyBarriers

                        ) {

                            onNearbyBarriers(

                                firstRoute.nearbyBarriers

                            );

                        }





                        if (onRouteInfo) {

                            onRouteInfo({

                                distance:

                                    firstRoute.distance,



                                duration:

                                    firstRoute.duration,



                                nearbyBarriers:

                                    firstRoute.nearbyBarriers,

                            });

                        }

                    } else {

                        if (

                            onNearbyBarriers

                        ) {

                            onNearbyBarriers([]);

                        }



                        if (onRouteInfo) {

                            onRouteInfo(null);

                        }

                    }



                } catch (error) {

                    console.error(

                        "Route error:",

                        error

                    );





                    if (cancelled) {

                        return;

                    }





                    setRoutes([]);





                    if (onRouteInfo) {

                        onRouteInfo(null);

                    }





                    if (

                        onNearbyBarriers

                    ) {

                        onNearbyBarriers([]);

                    }





                    if (

                        onRouteAlternatives

                    ) {

                        onRouteAlternatives(

                            []

                        );

                    }



                } finally {

                    if (!cancelled) {

                        setLoading(false);

                    }

                }

            };





        getRoute();





        return () => {

            cancelled = true;

        };



    }, [

        userLocation,

        destination,

        barriers,

        travelMode,

        onRouteInfo,

        onNearbyBarriers,

        onRouteAlternatives,

    ]);





    return (

        <>

            {/* ROUTE LINES */}



            {routes.map(

                (route, index) => (

                    <Polyline

                        key={`${travelMode}-${index}`}

                        positions={

                            route.route

                        }

                        pathOptions={{

                            color:

                                getRouteColor(

                                    index

                                ),



                            weight:

                                index === 0

                                    ? 7

                                    : 5,



                            opacity:

                                index === 0

                                    ? 0.9

                                    : 0.65,

                        }}

                    />

                )

            )}





            {/* LOADING */}



            {loading && (

                <div

                    style={{

                        position:

                            "absolute",



                        top: "10px",



                        left: "50%",



                        transform:

                            "translateX(-50%)",



                        zIndex: 1000,



                        background:

                            "white",



                        padding:

                            "9px 15px",



                        borderRadius:

                            "10px",



                        boxShadow:

                            "0 4px 15px rgba(0,0,0,0.15)",



                        fontSize:

                            "14px",



                        fontWeight:

                            "700",

                    }}

                >

                    {getModeLabel(

                        travelMode

                    )}{" "}

                    route calculating...

                </div>

            )}





            {/* ROUTE LEGEND */}



            {routes.length > 1 &&

                !loading && (

                    <div

                        style={{

                            position:

                                "absolute",



                            top: "12px",



                            right: "12px",



                            zIndex: 1000,



                            background:

                                "rgba(255,255,255,0.96)",



                            padding:

                                "12px 14px",



                            borderRadius:

                                "12px",



                            boxShadow:

                                "0 4px 18px rgba(0,0,0,0.15)",



                            minWidth:

                                "175px",

                        }}

                    >

                        <strong

                            style={{

                                display:

                                    "block",



                                marginBottom:

                                    "8px",

                            }}

                        >

                            {getModeLabel(

                                travelMode

                            )}{" "}

                            routes

                        </strong>





                        {routes.map(

                            (

                                route,

                                index

                            ) => (

                                <div

                                    key={index}

                                    style={{

                                        display:

                                            "flex",



                                        alignItems:

                                            "center",



                                        gap: "8px",



                                        marginTop:

                                            "6px",



                                        fontSize:

                                            "13px",

                                    }}

                                >

                                    <span

                                        style={{

                                            width:

                                                "12px",



                                            height:

                                                "12px",



                                            borderRadius:

                                                "50%",



                                            background:

                                                getRouteColor(

                                                    index

                                                ),



                                            display:

                                                "inline-block",

                                        }}

                                    />



                                    <span>

                                        Route{" "}

                                        {index + 1}:{" "}

                                        {route.score}

                                        /100

                                    </span>

                                </div>

                            )

                        )}

                    </div>

                )}

        </>

    );

}





// ======================================================

// BARRIER ICON

// ======================================================



function getBarrierIcon(

    type

) {

    let emoji = "⚠️";



    if (type === "Stairs") {

        emoji = "🪜";

    }



    if (

        type ===

        "Broken Footpath"

    ) {

        emoji = "🛣️";

    }



    if (

        type ===

        "Missing Ramp"

    ) {

        emoji = "♿";

    }



    if (

        type ===

        "Construction"

    ) {

        emoji = "🚧";

    }



    return L.divIcon({

        className:

            "barrier-map-icon",



        html: `

      <div

        style="

          width:42px;

          height:42px;

          border-radius:50%;

          background:white;

          border:3px solid #dc2626;

          display:flex;

          align-items:center;

          justify-content:center;

          font-size:22px;

          box-shadow:0 4px 12px rgba(0,0,0,0.25);

        "

      >

        ${emoji}

      </div>

    `,



        iconSize: [

            42,

            42,

        ],



        iconAnchor: [

            21,

            21,

        ],



        popupAnchor: [

            0,

            -21,

        ],

    });

}





// ======================================================

// REPORT LOCATION ICON

// ======================================================



const reportLocationIcon =

    L.divIcon({

        className:

            "report-location-icon",



        html: `

      <div

        style="

          width:42px;

          height:42px;

          border-radius:50%;

          background:#2563eb;

          border:4px solid white;

          display:flex;

          align-items:center;

          justify-content:center;

          font-size:22px;

          box-shadow:0 4px 14px rgba(0,0,0,0.3);

        "

      >

        📍

      </div>

    `,



        iconSize: [

            42,

            42,

        ],



        iconAnchor: [

            21,

            21,

        ],

    });





// ======================================================

// BARRIER MARKERS

// ======================================================



function BarrierMarkers({

    barriers,

    onBarrierFixed,

}) {

    if (

        !barriers ||

        barriers.length === 0

    ) {

        return null;

    }



    return (

        <>

            {barriers.map(

                (barrier) => (

                    <Marker

                        key={

                            barrier.id

                        }

                        position={

                            barrier.location

                        }

                        icon={getBarrierIcon(

                            barrier.type

                        )}

                    >

                        <Popup>

                            <div

                                style={{

                                    minWidth:

                                        "210px",

                                }}

                            >

                                <strong

                                    style={{

                                        fontSize:

                                            "17px",

                                    }}

                                >

                                    {barrier.type}

                                </strong>





                                {barrier.severity && (

                                    <p

                                        style={{

                                            margin:

                                                "7px 0",



                                            fontWeight:

                                                "700",

                                        }}

                                    >

                                        Severity:{" "}

                                        {

                                            barrier.severity

                                        }

                                    </p>

                                )}





                                <p

                                    style={{

                                        marginTop:

                                            "8px",



                                        marginBottom:

                                            "8px",

                                    }}

                                >

                                    {

                                        barrier.description

                                    }

                                </p>





                                <small>

                                    📍 Reported

                                    barrier

                                </small>





                                {barrier.image && (

                                    <img

                                        src={

                                            barrier.image

                                        }

                                        alt={

                                            barrier.type

                                        }

                                        style={{

                                            width:

                                                "100%",



                                            marginTop:

                                                "10px",



                                            borderRadius:

                                                "8px",

                                        }}

                                    />

                                )}





                                {onBarrierFixed && (

                                    <button

                                        onClick={() =>

                                            onBarrierFixed(

                                                barrier.id

                                            )

                                        }

                                        style={{

                                            width:

                                                "100%",



                                            marginTop:

                                                "12px",



                                            padding:

                                                "9px 12px",



                                            border:

                                                "none",



                                            borderRadius:

                                                "9px",



                                            background:

                                                "#16804f",



                                            color:

                                                "white",



                                            fontWeight:

                                                "700",



                                            cursor:

                                                "pointer",

                                        }}

                                    >

                                        ✅ Mark as

                                        Fixed

                                    </button>

                                )}

                            </div>

                        </Popup>

                    </Marker>

                )

            )}

        </>

    );

}





// ======================================================

// MAIN MAP

// ======================================================



function Map({

    userLocation,

    destination,

    travelMode =

    "pedestrian",



    onRouteInfo,

    onRouteAlternatives,



    barriers,

    onBarrierFixed,



    reportMode,



    selectedReportLocation,

    onLocationSelect,



    onNearbyBarriers,

}) {

    const defaultCenter = [

        13.0827,

        80.2707,

    ];



    return (

        <MapContainer

            center={

                defaultCenter

            }



            zoom={13}



            scrollWheelZoom={

                true

            }



            style={{

                height: "100%",

                width: "100%",



                cursor:

                    reportMode

                        ? "crosshair"

                        : "grab",

            }}

        >



            {/* OPENSTREETMAP */}



            <TileLayer

                attribution="© OpenStreetMap contributors"

                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

            />





            {/* MAP CONTROLLER */}



            <MapController

                userLocation={

                    userLocation

                }



                destination={

                    destination

                }

            />





            {/* MAP CLICK */}



            <MapClickHandler

                reportMode={

                    reportMode

                }



                onLocationSelect={

                    onLocationSelect

                }

            />





            {/* USER LOCATION */}



            {userLocation && (

                <Marker

                    position={

                        userLocation

                    }

                >

                    <Popup>

                        📍 You are here

                    </Popup>

                </Marker>

            )}





            {/* DESTINATION */}



            {destination && (

                <Marker

                    position={

                        destination

                    }

                >

                    <Popup>

                        🎯 Destination

                    </Popup>

                </Marker>

            )}





            {/* SELECTED REPORT LOCATION */}



            {selectedReportLocation && (

                <Marker

                    position={

                        selectedReportLocation

                    }



                    icon={

                        reportLocationIcon

                    }

                >

                    <Popup>

                        <strong>

                            📍 Barrier

                            location

                        </strong>



                        <p>

                            This is the

                            location you

                            selected for

                            the report.

                        </p>

                    </Popup>

                </Marker>

            )}





            {/* ROUTES */}



            <WalkingRoute

                userLocation={

                    userLocation

                }



                destination={

                    destination

                }



                barriers={

                    barriers

                }



                travelMode={

                    travelMode

                }



                onRouteInfo={

                    onRouteInfo

                }



                onNearbyBarriers={

                    onNearbyBarriers

                }



                onRouteAlternatives={

                    onRouteAlternatives

                }

            />





            {/* BARRIER MARKERS */}



            <BarrierMarkers

                barriers={

                    barriers

                }



                onBarrierFixed={

                    onBarrierFixed

                }

            />



        </MapContainer>

    );

}





export default Map;