import React, { useState, useEffect, useRef } from 'react';

// --- Mock Data ---
const mockPodcasts = [
    { name: "Tech Weekly", url: "https://github.com/abh1hi/aura-player/raw/refs/heads/main/media-file/Daily-Insights.m4a" },
    { name: "Daily Insights", url: "https://storage.googleapis.com/media-session/sintel/sintel-short.mp3" },
    { name: "Science Hour", url: "https://storage.googleapis.com/media-session/sintel/sintel-short.mp3" },
];

const mockNews = [
    { id: 1, title: "Global Markets Rally on New Tech Innovations", source: "Tech Chronicle", time: "1h ago" },
    { id: 2, title: "Scientists Discover New Planet in Nearby Galaxy", source: "Science Today", time: "3h ago" },
    { id: 3, title: "The Future of Remote Work: A Deep Dive", source: "Business Insider", time: "5h ago" },
    { id: 4, title: "How AI is Revolutionizing the Healthcare Industry", source: "Future Forward", time: "8h ago" },
    { id: 5, title: "City Unveils New Green Initiative to Combat Climate Change", source: "Local News", time: "1d ago" },
    { id: 6, title: "New Art Exhibit Opens Downtown to Rave Reviews", source: "Arts & Culture", time: "2d ago" },
];


// --- Helper Components ---

const Header = () => (
    <div className="text-center p-4 bg-slate-900/70 backdrop-blur-sm sticky top-0 z-20 border-b border-slate-700">
        <h1 className="text-2xl font-bold text-white">Aura Player</h1>
        <p className="text-slate-400 text-sm">Your daily audio & news companion</p>
    </div>
);

const Navigation = ({ currentPage, setCurrentPage }) => {
    const navItems = ['Player', 'News'];
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 z-20">
            <div className="flex justify-around max-w-md mx-auto">
                {navItems.map(item => (
                    <button
                        key={item}
                        onClick={() => setCurrentPage(item.toLowerCase())}
                        className={`w-full py-4 text-center font-semibold transition-colors duration-300 ${currentPage === item.toLowerCase() ? 'text-pink-400 border-t-2 border-pink-400' : 'text-slate-400 hover:text-white'}`}
                    >
                        {item}
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- Page Components ---

const PlayerPage = () => {
    const [audioSrc, setAudioSrc] = useState(mockPodcasts[0].url);
    const [audioTitle, setAudioTitle] = useState(mockPodcasts[0].name);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const audioPlayerRef = useRef(null);
    const canvasRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const dataArrayRef = useRef(null);
    const animationFrameId = useRef(null);

    const setupAudioContext = () => {
        if (!audioContextRef.current) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.88;
            
            if (audioPlayerRef.current && !sourceRef.current) {
                const source = audioContext.createMediaElementSource(audioPlayerRef.current);
                source.connect(analyser);
                analyser.connect(audioContext.destination);
                sourceRef.current = source;
            }
            
            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        }
    };

    const draw = () => {
        if (!analyserRef.current || !canvasRef.current || !dataArrayRef.current) {
            animationFrameId.current = requestAnimationFrame(draw);
            return;
        };

        const analyser = analyserRef.current;
        const dataArray = dataArrayRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const { width, height } = canvas.getBoundingClientRect();
        
        const dpr = window.devicePixelRatio || 1;
        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
        }

        analyser.getByteTimeDomainData(dataArray);

        ctx.clearRect(0, 0, width, height);

        // Background glow
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += Math.abs(dataArray[i] - 128);
        const avg = sum / dataArray.length;
        const radius = (width / 4) + (avg * 2.5);
        const bgGradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, radius);
        bgGradient.addColorStop(0, 'rgba(236, 72, 153, 0.15)');
        bgGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        // Waveform
        const gradient = ctx.createLinearGradient(0, height * 0.2, 0, height * 0.8);
        gradient.addColorStop(0, '#f9a8d4');
        gradient.addColorStop(0.5, '#c084fc');
        gradient.addColorStop(1, '#93c5fd');
        
        ctx.lineWidth = 6;
        ctx.strokeStyle = gradient;
        ctx.shadowColor = 'rgba(192, 132, 252, 0.5)';
        ctx.shadowBlur = 20;

        const numSegments = 80;
        const segmentDataLength = Math.floor(dataArray.length / numSegments);
        const averagedPoints = [];

        for (let i = 0; i < numSegments; i++) {
            let sum = 0;
            for (let j = 0; j < segmentDataLength; j++) {
                sum += dataArray[(i * segmentDataLength) + j];
            }
            averagedPoints.push(sum / segmentDataLength);
        }

        ctx.beginPath();
        const sliceWidth = width / (numSegments - 1);
        let x = 0;
        let y = (averagedPoints[0] / 128.0) * height / 2;
        ctx.moveTo(x, y);

        for (let i = 1; i < numSegments - 2; i++) {
            const xc = (x + (x + sliceWidth)) / 2;
            const yc = (y + (averagedPoints[i] / 128.0) * height / 2) / 2;
            ctx.quadraticCurveTo(x, y, xc, yc);
            x += sliceWidth;
            y = (averagedPoints[i] / 128.0) * height / 2;
        }
        ctx.quadraticCurveTo(x, y, width, (averagedPoints[numSegments - 1] / 128.0) * height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        animationFrameId.current = requestAnimationFrame(draw);
    };
    
    useEffect(() => {
        animationFrameId.current = requestAnimationFrame(draw);
        return () => {
            cancelAnimationFrame(animationFrameId.current);
        };
    }, []);

    const handlePlayPause = () => {
        if (!audioContextRef.current) {
            setupAudioContext();
        }
        
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        if (isPlaying) {
            audioPlayerRef.current.pause();
        } else {
            audioPlayerRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setAudioSrc(url);
            setAudioTitle(file.name);
            setIsPlaying(false);
        }
    };

    const handlePodcastSelect = (podcast) => {
        setAudioSrc(podcast.url);
        setAudioTitle(podcast.name);
        setIsPlaying(false);
    };
    
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className="p-4 space-y-4">
            <div className="relative w-full max-w-sm mx-auto aspect-[9/16] bg-black rounded-lg shadow-2xl shadow-pink-500/10">
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full rounded-lg"></canvas>
                <div className="absolute bottom-4 left-4 right-4 text-white text-center p-2 bg-black/30 rounded">
                    <h2 className="font-bold truncate">{audioTitle}</h2>
                </div>
            </div>

            <audio
                ref={audioPlayerRef}
                src={audioSrc}
                onLoadedMetadata={() => setDuration(audioPlayerRef.current.duration)}
                onTimeUpdate={() => setCurrentTime(audioPlayerRef.current.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
            />

            <div className="max-w-sm mx-auto space-y-3">
                 <input type="range" value={currentTime} max={duration || 0} onChange={(e) => { audioPlayerRef.current.currentTime = e.target.value; }} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-400"/>
                <div className="flex justify-between items-center text-sm text-slate-400 px-1">
                    <span>{formatTime(currentTime)}</span>
                    <button onClick={handlePlayPause} className="text-white">
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            <div className="max-w-sm mx-auto space-y-4">
                <h3 className="font-semibold text-lg text-white">Listen to a Podcast</h3>
                <div className="space-y-2">
                    {mockPodcasts.map(p => (
                        <button key={p.name} onClick={() => handlePodcastSelect(p)} className="w-full text-left p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                            <p className="font-medium text-white">{p.name}</p>
                        </button>
                    ))}
                </div>
                <h3 className="font-semibold text-lg text-white pt-2">Or Upload Your Own</h3>
                <input type="file" accept="audio/*" onChange={handleFileChange} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-600 cursor-pointer"/>
            </div>
        </div>
    );
};

const NewsPage = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Replace with your actual API key from NewsAPI.org
        const apiKey = 'b65b3a0681b64a6996dfeb864171ad79'; 
        const apiUrl = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`;

        fetch(apiUrl)
            .then(res => res.json())
            .then(data => {
                if (data.articles) {
                    setArticles(data.articles);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching news:", err);
                setLoading(false);
            });
    }, []); // The empty array ensures this runs only once when the component loads

    return (
        <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold text-white px-2">Top Headlines</h2>
            {loading ? (
                <p className="text-center text-slate-400">Loading news...</p>
            ) : (
                <div className="space-y-3">
                    {articles.map((article, index) => (
                        // Each article is now a clickable link
                        <a 
                          key={index} 
                          href={article.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block bg-slate-800 p-4 rounded-lg hover:bg-slate-700/80 transition-colors"
                        >
                            <h3 className="font-semibold text-white mb-1">{article.title}</h3>
                            <div className="flex justify-between items-center text-xs text-slate-400">
                                <span>{article.source.name}</span>
                                <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};
// --- Icon Components ---
const PlayIcon = () => <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8.002v3.996a1 1 0 001.555.832l3.197-1.998a1 1 0 000-1.664l-3.197-1.998z"></path></svg>;
const PauseIcon = () => <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h1a1 1 0 001-1V8a1 1 0 00-1-1H8zm3 0a1 1 0 00-1 1v4a1 1 0 001 1h1a1 1 0 001-1V8a1 1 0 00-1-1h-1z"></path></svg>;


// --- Main App Component ---
export default function App() {
    const [currentPage, setCurrentPage] = useState('player');
    
    // --- PWA Setup Effect ---
    useEffect(() => {
        // 1. Create and inject the manifest link
        const manifest = {
            "name": "Aura Player",
            "short_name": "Aura",
            "start_url": ".",
            "display": "standalone",
            "background_color": "#0f172a",
            "theme_color": "#0f172a",
            "description": "Your daily audio & news companion.",
            "icons": [
                { "src": "https://placehold.co/192x192/0f172a/f1f5f9?text=Aura", "type": "image/png", "sizes": "192x192" },
                { "src": "https://placehold.co/512x512/0f172a/f1f5f9?text=Aura", "type": "image/png", "sizes": "512x512" }
            ]
        };
        const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
        const manifestUrl = URL.createObjectURL(manifestBlob);
        
        const linkEl = document.createElement('link');
        linkEl.rel = 'manifest';
        linkEl.href = manifestUrl;
        document.head.appendChild(linkEl);

        // 2. Register the service worker
        if ('serviceWorker' in navigator) {
            const swContent = `
                const CACHE_NAME = 'aura-player-cache-v1';
                const urlsToCache = [
                    '/',
                    '/index.html'
                ];
                self.addEventListener('install', event => {
                    event.waitUntil(
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                console.log('Opened cache');
                                return cache.addAll(urlsToCache);
                            })
                    );
                });
                self.addEventListener('fetch', event => {
                    event.respondWith(
                        caches.match(event.request)
                            .then(response => {
                                if (response) {
                                    return response;
                                }
                                return fetch(event.request);
                            })
                    );
                });
            `;
            const swBlob = new Blob([swContent], {type: 'application/javascript'});
            const swUrl = URL.createObjectURL(swBlob);

            navigator.serviceWorker.register(swUrl)
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        }

        return () => {
            // Cleanup the created elements and URLs if the component unmounts
            document.head.removeChild(linkEl);
            URL.revokeObjectURL(manifestUrl);
        };
    }, []);


    const renderPage = () => {
        switch (currentPage) {
            case 'player':
                return <PlayerPage />;
            case 'news':
                return <NewsPage />;
            default:
                return <PlayerPage />;
        }
    };

    return (
        <div className="bg-slate-900 min-h-screen text-slate-200 font-sans pb-20">
            <Header />
            <main className="max-w-md mx-auto">
                {renderPage()}
            </main>
            <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
        </div>
    );
}
