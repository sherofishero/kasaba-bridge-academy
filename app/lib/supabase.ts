import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://iczbrmbrvpdwzyustgry.supabase.co",
  "sb_publishable_iM8pdwTuV73_p0EQBLmxTw_eL1P1v8w",
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);