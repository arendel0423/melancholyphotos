import '../styles/site.css';
import '../styles/home.css';

import RouteStyles from '../components/RouteStyles';

function Home() {

    RouteStyles();

    return (
        <div className="mx-auto h-full w-full text-white">
            <div className="place-items-center items-start justify-center 2xl:flex">
                <div className="hidden pt-[250px] pr-[25px] 2xl:visible 2xl:block">
                    <img src="/src/assets/eyes1.png" />
                </div>
                <div className="min-h-screen w-[var(--content-max-width)]">
                    <div className="w-full pt-10 pb-10">
                        <img className="mx-auto" src="/src/assets/hometitle.png" />
                    </div>
                    <div className="z-0 flex w-full">
                        <div className="z-10 w-[40%] place-items-end">
                            <div className="pb-10">
                                <a href="/gallery" className="block h-[271px] w-[280px] bg-[url(/src/assets/gallerytv.png)] hover:bg-[url(/src/assets/gallerytvhover.png)]"></a>
                            </div>
                        </div>
                        <div className="z-0 flex w-[30%] place-items-end overflow-hidden align-bottom"><img className="ml-[-10%]" src="/src/assets/cords1.png" /></div>
                        <div className="z-10 flex w-[30%] place-items-end align-bottom">
                            <div className="ml-[-22%]">
                                <a href="/stuff" className="block h-[247px] w-[254px] bg-[url(/src/assets/stufftv.png)] hover:bg-[url(/src/assets/stufftvhover.png)]"></a>
                            </div>
                        </div>
                    </div>
                    <div className="z-0 flex w-full">
                        <div className="z-0 mt-[-6%] w-[50%]"><img className="ml-[50%]" src="/src/assets/cords2.png" /></div>
                        <div className="z-0 mt-[-4%] w-[50%]"><img className="ml-[62%]" src="/src/assets/cords4.png" /></div>
                    </div>
                    <div className="z-0 mt-[-28%] flex w-full">
                        <div className="z-10 w-[45%] place-items-end pt-10 pl-10">
                            <div className="pb-10">
                                <a href="/about" className="block h-[268px] w-[276px] bg-[url(/src/assets/abouttv.png)] hover:bg-[url(/src/assets/abouttvhover.png)]"></a>
                            </div>
                        </div>
                        <div className="z-0 flex w-[30%] place-items-end overflow-hidden align-bottom"><img className="ml-[-12%]" src="/src/assets/cords3.png" /></div>
                        <div className="z-10 flex w-[25%] place-items-end align-bottom">
                            <div className="ml-[-35%]">
                                <a href="/projects" className="block h-[201px] w-[207px] bg-[url(/src/assets/projectstv.png)] hover:bg-[url(/src/assets/projectstvhover.png)]"></a>
                            </div>
                        </div>
                    </div>
                    <div className="mt-30 pb-5 text-center text-gray-400">
                        Copyright 2025 MelancholyMind
                    </div>
                </div>
                <div className="hidden pt-[165px] pl-[25px] 2xl:visible 2xl:block">
                    <img src="/src/assets/eyes2.png" />
                </div>
            </div>
        </div>
    );

}

export default Home;