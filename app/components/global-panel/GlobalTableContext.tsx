"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { supabase } from "../../lib/supabase";

type GlobalTableContextValue = {
    activeTableId: string | null;
    setActiveTableId: (tableId: string | null) => void;
    onlineUsers: string[];
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
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

    useEffect(() => {
        const channel = supabase.channel("site-presence", {
            config: {
                presence: {
                    key: crypto.randomUUID(),
                },
            },
        });

        const updateUsers = () => {
            const names = Object.values(channel.presenceState())
                .flatMap((entries) =>
                    entries.map((entry) => {
                        const value = entry as { username?: unknown };
                        return typeof value.username === "string"
                            ? value.username.trim()
                            : "";
                    })
                )
                .filter((name): name is string => name.length > 0);

            setOnlineUsers([...new Set(names)].sort((a, b) =>
                a.localeCompare(b, "tr")
            ));
        };

        const username = localStorage.getItem("guestName")?.trim();
        const presence = channel
            .on("presence", { event: "sync" }, updateUsers)
            .on("presence", { event: "join" }, updateUsers)
            .on("presence", { event: "leave" }, updateUsers);

        void presence.subscribe(async (status) => {
            if (status !== "SUBSCRIBED") {
                return;
            }

            if (username) {
                await presence.track({ username });
            }

            updateUsers();
        });

        return () => {
            void supabase.removeChannel(presence);
        };
    }, []);

    return (
        <GlobalTableContext.Provider
            value={{
                activeTableId,
                setActiveTableId,
                onlineUsers,
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
