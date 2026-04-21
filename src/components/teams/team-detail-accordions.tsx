"use client";

import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const cardShell = "rounded-lg border border-border bg-card px-4 shadow-sm";

type Props = {
  rosterCount:  number;
  lineupCount:  number;
  memberCount:  number;
  rostersDesc:  string;
  lineupsDesc:  string;
  membersDesc:  string;
  rostersSlot:  ReactNode;
  lineupsSlot:  ReactNode;
  membersSlot:  ReactNode;
};

function TriggerLabel({
  title,
  count,
  description,
}: {
  title:       string;
  count:       number;
  description: string;
}) {
  return (
    <span className="flex flex-col items-start gap-1 pr-2 text-left">
      <span className="flex flex-wrap items-center gap-2">
        <span>{title}</span>
        <Badge variant="secondary" className="font-normal tabular-nums">
          {count}
        </Badge>
      </span>
      <span className="text-sm font-normal text-muted-foreground">{description}</span>
    </span>
  );
}

export function TeamDetailAccordions({
  rosterCount,
  lineupCount,
  memberCount,
  rostersDesc,
  lineupsDesc,
  membersDesc,
  rostersSlot,
  lineupsSlot,
  membersSlot,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Accordion
        type="single"
        collapsible
        defaultValue="rosters"
        className={cn(cardShell)}
      >
        <AccordionItem value="rosters" className="border-0">
          <AccordionTrigger className="hover:no-underline">
            <TriggerLabel title="Rosters" count={rosterCount} description={rostersDesc} />
          </AccordionTrigger>
          <AccordionContent>{rostersSlot}</AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="single" collapsible className={cn(cardShell)}>
        <AccordionItem value="lineups" className="border-0">
          <AccordionTrigger className="hover:no-underline">
            <TriggerLabel title="Game lineups" count={lineupCount} description={lineupsDesc} />
          </AccordionTrigger>
          <AccordionContent>{lineupsSlot}</AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="single" collapsible className={cn(cardShell)}>
        <AccordionItem value="members" className="border-0">
          <AccordionTrigger className="hover:no-underline">
            <TriggerLabel title="Team members" count={memberCount} description={membersDesc} />
          </AccordionTrigger>
          <AccordionContent>{membersSlot}</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
