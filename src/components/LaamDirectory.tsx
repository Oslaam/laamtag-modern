import React, { useState } from 'react';
import { useLaamProgram } from '../hooks/use-laam-program';
import { Search, ShieldCheck, User } from 'lucide-react';

export const LaamDirectory = () => {
    const [searchName, setSearchName] = useState('');
    const [owner, setOwner] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const { resolveName } = useLaamProgram();

    const handleSearch = async () => {
        if (!searchName) return;
        setIsSearching(true);
        try {
            const result = await resolveName(searchName.toLowerCase());
            setOwner(result ? result.toBase58() : "Not Found");
        } catch (err) {
            setOwner("Error searching");
        }
        setIsSearching(false);
    };

    return (
        <div className="mt-12 max-w-2xl mx-auto p-8 bg-gradient-to-br from-gray-900 to-black rounded-3xl border border-yellow-500/20 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
                <Search className="text-yellow-500" />
                <h3 className="text-2xl font-bold text-white">.laam Directory Explorer</h3>
            </div>

            <div className="flex gap-3">
                <input
                    type="text"
                    placeholder="Search Tag (e.g. oslaam)"
                    className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/10 text-white focus:border-yellow-500 outline-none transition-all"
                    onChange={(e) => setSearchName(e.target.value)}
                />
                <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-8 rounded-2xl transition-all disabled:opacity-50"
                >
                    {isSearching ? '...' : 'LOOKUP'}
                </button>
            </div>

            {owner && (
                <div className={`mt-8 p-6 rounded-2xl border animate-in fade-in slide-in-from-bottom-4 ${owner === "Not Found" ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        {owner === "Not Found" ? <ShieldCheck className="text-red-400" size={18} /> : <User className="text-yellow-500" size={18} />}
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            Status: {owner === "Not Found" ? "Available" : "Registered"}
                        </span>
                    </div>
                    <p className="font-mono text-white break-all text-sm leading-relaxed">
                        {owner === "Not Found" ? "This name is available for registration!" : owner}
                    </p>
                </div>
            )}
        </div>
    );
};