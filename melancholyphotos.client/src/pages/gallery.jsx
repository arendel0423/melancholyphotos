import '../styles/site.css';

import RouteStyles from '../components/RouteStyles';


function Gallery() {

    RouteStyles();

    return (
        <div className="mx-auto h-full w-full">
            <div className="place-items-center items-start justify-center 2xl:flex">
                <div className="border-2 m-3 min-h-[900px] w-[var(--content-max-width)] border-orange-800">
                    <div className="h-[650px] w-full bg-[url(/src/assets/galleryroom.png)]">
                        
                    </div>
                    <div className="border-t-2 h-[250px] w-full border-orange-800 bg-[url(/src/assets/galleryuibg.png)]">
                        
                    </div>
                </div>
            </div>
        </div>
    );

}

export default Gallery;