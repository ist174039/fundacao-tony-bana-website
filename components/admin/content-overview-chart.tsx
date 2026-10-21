"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

type ContentOverviewChartProps = {
  news: number
  members: number
  partners: number
  gallery: number
}

const chartConfig = {
  total: { label: "Registos", color: "hsl(var(--primary))" },
}

export function ContentOverviewChart({ news, members, partners, gallery }: ContentOverviewChartProps) {
  const data = [
    { section: "Notícias", total: news },
    { section: "Membros", total: members },
    { section: "Parceiros", total: partners },
    { section: "Galeria", total: gallery },
  ]

  return <Card className="admin-chart-card site-card overflow-hidden">
    <CardHeader className="pb-2">
      <CardTitle className="text-base">Conteúdo por secção</CardTitle>
      <CardDescription>Quantidade de registos publicados no site</CardDescription>
    </CardHeader>
    <CardContent className="pt-0">
      {data.every((item) => item.total === 0) ? <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/60 text-sm text-muted-foreground">Ainda não existem conteúdos publicados.</div> : <ChartContainer config={chartConfig} className="h-52 w-full aspect-auto">
        <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" />
          <XAxis dataKey="section" tickLine={false} axisLine={false} tickMargin={10} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="total" fill="var(--color-total)" radius={[7, 7, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ChartContainer>}
    </CardContent>
  </Card>
}
