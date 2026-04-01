import { useState, useEffect } from 'react';
import '../styles/site.css';

import RouteStyles from '../components/RouteStyles';
import GalleryViewer from '../components/GalleryViewer';
import CarStereo from '../components/CarStereo';

function Gallery() {

    RouteStyles();

    const [albums, setAlbums] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/api/gallery')
            .then(r => {
                if (!r.ok) throw new Error(`Gallery API error: ${r.status}`);
                return r.json();
            })
            .then(setAlbums)
            .catch(err => setError(err.message));
    }, []);

    return (
        <div className="mx-auto h-full w-full">
            <div className="place-items-center items-start justify-center 2xl:flex">
                <div className="m-3 flex flex-col items-center">
                    {error && (
                        <div className="text-red-400 p-4">{error}</div>
                    )}
                    {!albums && !error && (
                        <div className="text-gray-400 p-4">Loading gallery…</div>
                    )}
                    {albums && <GalleryViewer albums={albums} />}
                    <div className="border-t-2 w-[900px] border-orange-800 bg-[#3d1a08]">
                        <CarStereo />
                    </div>
                </div>
            </div>
        </div>
    );

}

export default Gallery;