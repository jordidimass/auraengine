"use client";

import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../../convex/_generated/api";

export function UserEnsure({ children }: { children: React.ReactNode }) {
  const ensureUser = useMutation(api.users.ensure);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) {
      return;
    }
    calledRef.current = true;
    void ensureUser({}).catch(() => {
      calledRef.current = false;
    });
  }, [ensureUser]);

  return <>{children}</>;
}
