import '../styles/site.css';

import RouteStyles from '../components/RouteStyles';
import BedroomViewer from '../components/BedroomViewer';
import CarStereo from '../components/CarStereo';

function About() {

    RouteStyles();

    return (
        <div className="mx-auto h-full w-full">
            <div className="place-items-center items-start justify-center 2xl:flex">
                <div className="m-3 flex flex-col items-center">
                    <BedroomViewer />
                    <div className="border-t-2 w-[900px] border-cyan-800 bg-[#030310]">
                        <CarStereo playlistUrl="/api/about-playlist" />
                    </div>
                </div>
            </div>
        </div>
    );

}

export default About;
