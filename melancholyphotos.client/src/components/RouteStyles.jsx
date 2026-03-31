import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function RouteStyles() {

    const location = useLocation();
    var className = "homepage"; // default page

    useEffect(() => {
        document.body.classList.remove('home', 'gallery'); // Remove existing classes

        if (location.pathname != "/") {
            className = location.pathname.slice(1) + "page";
        }

        document.body.classList.add(className); // Add class based on route

        return () => {
            document.body.classList.remove(className); // Cleanup on unmount
        };
    }, [location]);

}

export default RouteStyles;