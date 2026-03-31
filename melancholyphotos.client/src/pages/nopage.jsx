import '../styles/site.css';

import RouteStyles from '../components/RouteStyles';

function NoPage() {

    RouteStyles();

    return (
        <div className="mx-auto h-full w-full text-white">
            <div className="place-items-center items-start justify-center 2xl:flex">
                <div><h1>This page doesn't exist...</h1></div>
            </div>
        </div>
    );

}

export default NoPage;