"use client";

import {
    createContext,
    useContext,
    useState,
    type ReactNode,
} from "react";

type GlobalTableContextValue = {
    activeTableId: string | null;
    setActiveTableId: (tableId: string | null) => void;
};

const GlobalTableContext =
    createContext<GlobalTableContextValue | null>(null);

export function GlobalTableProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [activeTableId, setActiveTableId] =
        useState<string | null>(null);

    return (
        <GlobalTableContext.Provider
            value={{
                activeTableId,
                setActiveTableId,
            }}
        >
            {children}
        </GlobalTableContext.Provider>
    );
}

export function useGlobalTable() {
    const context = useContext(GlobalTableContext);

    if (!context) {
        throw new Error(
            "useGlobalTable must be used within GlobalTableProvider"
        );
    }

    return context;
}
