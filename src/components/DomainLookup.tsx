import React, { useState } from 'react';
import { useLaamProgram } from '../hooks/use-laam-program';

export const DomainLookup = () => {
    const [searchName, setSearchName] = useState('');
    const [owner, setOwner] = useState<string | null>(null);
    const { resolveName } = useLaamProgram();

    const handleSearch = async () => {
        const result = await resolveName(searchName);
        if (result) {
            setOwner(result.toBase58());
        } else {
            setOwner("Not Registered yet!");
        }
    };

    return (
        <div className="mt-10 p-6 bg-black/40 border border-yellow-500/30 rounded-2xl backdrop-blur-md">
            <h3 className="text-xl font-bold text-white mb-4">Search .laam Directory</h3>
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Enter name (e.g. oslaam)"
                    className="flex-1 bg-white/10 p-3 rounded-xl border border-white/20 text-white outline-none focus:border-yellow-500"
                    onChange={(e) => setSearchName(e.target.value)}
                />
                <button onClick={handleSearch} className="bg-yellow-500 hover:bg-yellow-400 px-6 py-2 rounded-xl text-black font-bold transition-all">
                    Lookup
                </button>
            </div>
            {owner && (
                <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <p className="text-sm text-gray-400 uppercase tracking-widest text-[10px] font-bold">Current Owner</p>
                    <p className="text-yellow-500 font-mono break-all">{owner}</p>
                </div>
            )}
        </div>
    );
};