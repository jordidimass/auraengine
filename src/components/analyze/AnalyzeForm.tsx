"use client";

import { useState } from "react";
import { Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiskSlider } from "@/components/RiskSlider";

export function AnalyzeForm() {
  const [url, setUrl] = useState("");
  const [riskLevel, setRiskLevel] = useState(72);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Competitor post</CardTitle>
        <CardDescription>
          Paste an X or LinkedIn URL. Risk sets how sharp the draft comes back.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="competitor-url">Competitor post URL</Label>
            <Input
              id="competitor-url"
              required
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://x.com/competitor/status/…"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="h-11"
            />
          </div>

          <RiskSlider value={riskLevel} onChange={setRiskLevel} />

          <Button type="submit" size="lg" className="h-11 w-full">
            <Radar data-icon="inline-start" />
            Analyze competitor
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
