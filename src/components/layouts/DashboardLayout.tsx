import { AuthContext } from "@/context/AuthContext";
import axios from "axios";
import { useRouter } from "next/router";
import { useContext, useEffect, useReducer, useState } from "react";
import Image from 'next/image';
import SkeletonText from "@/components/loader/SkeletonText";
import io, { Socket } from 'socket.io-client';
import Link from "next/link";
import { SocketContext } from "@/context/SocketContext";
import { globalReducer } from "@/utils/reducer";

export default function DashboardLayout(props: {children: React.ReactNode}) {

    var authContext = useContext(AuthContext);
    const router = useRouter();

    const [socket, setSocket] = useState<Socket>();

    const [selfData, setSelfData] = useState<any>();
    //const [channelData, setChannelData] = useState<any>();

    const [channels, dispatchChannels] = useReducer(globalReducer, []);
    const [channelsLoaded, setChannelsLoaded] = useState<boolean>(false);

    useEffect(()=>{
        if (!authContext.awaitAuth && !authContext.loggedIn) router.push('/login?url='+router.route);
    }, [authContext]);

    useEffect(()=>{
        if (authContext.awaitAuth || !authContext.loggedIn || selfData) return;

        axios.get('/api/user', {headers: {Authorization: authContext.resourceToken}}).then(res=>{
            setSelfData(res.data);
        })
        axios.get("/api/user/channels", {headers: {Authorization: authContext.resourceToken}}).then(res=>{
            dispatchChannels({action: 'set', data: res.data.channels});
            setChannelsLoaded(true);
        })

        axios.get('/api/ws').then(res=>{
            if (socket) return;
            const newSocket = io({auth: {token: authContext.resourceToken}});
            newSocket.on('connect', ()=>{
                console.log('WebSocket connected');
            });
            newSocket.on('message', (data)=>{
                console.log(`Received message: ${data}`);
            });
            setSocket(newSocket);
        });
        // Cleanup
        return ()=>{
            if (socket) socket.disconnect();
        }
    }, [authContext.awaitAuth]);


    // Channel updates
    useEffect(()=>{
        if (!socket) return;
        socket.on('update', channelUpdate);
        return ()=>{
            socket?.off('update', channelUpdate);
        }
    }, [socket]);
    function channelUpdate(data: any){
        if (data.type !== 'channels') return;

        console.log(data);

        dispatchChannels(data);
    }


    const [open, setOpen] = useState<boolean>(true);

    return (
        <SocketContext.Provider value={socket}>
        <div className="fixed top-0 right-0 left-0 bottom-0 gradient bg-opacity-50 flex">
            <div className={`flex flex-col flex-shrink-0 items-stretch w-full gradient bg-opacity-80 rounded-r-lg sm:rounded-r-2xl shadow-xl overflow-hidden ${open ? 'max-w-screen-sm sm:max-w-[20rem]' : 'max-w-[64px]'} transition-all`}
                onClick={()=>{if(!open) setOpen(true)}}>
                <div className={`h-16 flex items-center ${open ? 'px-4' : 'px-2'} py-2 bg-black bg-opacity-5 dark:bg-opacity-25 shadow-lg transition-all`}>
                    <div className="w-12 h-12 flex-shrink-0 mr-4 rounded-full overflow-hidden shadow-lg">
                        { selfData ?
                            <Image src={`/imgs/profile.jpg`} alt="Profile Picture" width={48} height={48}></Image>
                        :
                            <div className="skeleton-pfp"></div>
                        }
                    </div>
                    <div className={`w-full mr-auto whitespace-nowrap ${open ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                        { selfData ?
                            <>
                                <div className="text-lg font-bold -mb-[2px]">{selfData.username}</div>
                                <div className="text-sm opacity-25">Id: {selfData.id}</div>
                            </>
                        :
                            <>
                                <SkeletonText width={160} className="text-lg font-bold -mb-[2px]"></SkeletonText>
                                <SkeletonText width={140} className="text-sm"></SkeletonText>
                            </>
                        }
                    </div>
                    <div className={`px-1 ${open ? 'opacity-50' : 'opacity-0'} hover:opacity-75 transition-opacity cursor-pointer`}>
                        <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 96 960 960"><path d="m388 976-20-126q-19-7-40-19t-37-25l-118 54-93-164 108-79q-2-9-2.5-20.5T185 576q0-9 .5-20.5T188 535L80 456l93-164 118 54q16-13 37-25t40-18l20-127h184l20 126q19 7 40.5 18.5T669 346l118-54 93 164-108 77q2 10 2.5 21.5t.5 21.5q0 10-.5 21t-2.5 21l108 78-93 164-118-54q-16 13-36.5 25.5T592 850l-20 126H388Zm92-270q54 0 92-38t38-92q0-54-38-92t-92-38q-54 0-92 38t-38 92q0 54 38 92t92 38Z"/></svg>
                    </div>
                </div>
                <div className={`flex-shrink-0 relative w-full h-full ${open ? 'pr-6 slim-scrollbar' : 'thin-scrollbar'}`}>
                    <div className="w-full h-[calc(100vh-64px)] overflow-y-auto">
                        <div>
                            <div className={`flex justify-center ${open ? '' : ''}`}>
                                <Link href="/friends" className={`text-sm font-semibold text-center bg-black bg-opacity-0 dark:bg-opacity-10 shadow ${open ? 'w-fit rounded px-4 py-1 my-2' : 'w-full py-3'} hover:bg-opacity-10 hover:dark:bg-opacity-20 transition-all`}>Friends</Link>
                            </div>
                            { !channelsLoaded ?
                                <>
                                    {[12, 16, 9, 10, 15, 9, 12, /*15, 17, 10, 8*/].map((x, i) =>
                                        <div className={`flex items-center gap-2 py-1 ${open ? `px-4` : `px-2`} transition-all`} key={i}>
                                            <div className="skeleton-pfp"></div>
                                            <SkeletonText className={`text-lg font-bold ${open ? 'opacity-100' : 'opacity-0'} transition-opacity`} width={x*10}></SkeletonText>
                                        </div>
                                    )}
                                </>
                            :
                                <>
                                    {(channels).sort((a,b)=>new Date(b.lastMessage).getTime()-new Date(a.lastMessage).getTime()).map((x, i) =>
                                        <Link href={`/channel/${x.id}`} className={`flex items-center gap-2 py-1 bg-black bg-opacity-0 hover:bg-opacity-10 ${open ? `px-4` : `px-2`} transition-all`} key={x.id}>
                                            <div className="skeleton-pfp"></div>
                                            <div className={`text-lg font-bold overflow-hidden whitespace-nowrap text-ellipsis ${open ? 'opacity-100' : 'opacity-0'} transition-opacity`}>{x.name || (x.members as any[]).map(x=>x.username).sort().join(', ')}</div>
                                        </Link>
                                    )}
                                </>
                            }
                        </div>
                    </div>
                    <div className={`absolute top-0 right-0 bottom-0 w-6 flex items-center justify-center bg-black transition text-4xl font-bold cursor-pointer ${open ? 'bg-opacity-20 hover:bg-opacity-30 opacity-75 hover:opacity-100 translate-x-0' : 'bg-opacity-0 opacity-0 translate-x-6'} transition-all`} 
                        title="Close Sidebar" onClick={()=>{setOpen(false)}}>⟨</div>
                </div>
            </div>
            <div className="w-full relative min-w-[calc(100vw-64px)] sm:min-w-0 h-screen">
                {props.children}
            </div>
        </div>
        </SocketContext.Provider>
    )
}