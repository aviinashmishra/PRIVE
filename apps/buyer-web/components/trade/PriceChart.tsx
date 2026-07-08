"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { useStore } from "@/lib/store";

export function PriceChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const candles = useStore((s) => s.bySymbol(symbol)?.candles);

  // create once
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#7A8A82",
        fontFamily: "var(--font-mono)",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(230,238,233,0.7)" },
        horzLines: { color: "rgba(230,238,233,0.7)" },
      },
      rightPriceScale: { borderColor: "#E6EEE9" },
      timeScale: { borderColor: "#E6EEE9", timeVisible: true, secondsVisible: false },
      crosshair: {
        vertLine: { color: "#B3C9BD", labelBackgroundColor: "#0B6244" },
        horzLine: { color: "#B3C9BD", labelBackgroundColor: "#0B6244" },
      },
      handleScroll: true,
      handleScale: true,
    });
    const series = chart.addCandlestickSeries({
      upColor: "#0E9E68",
      downColor: "#D2564B",
      borderUpColor: "#0E9E68",
      borderDownColor: "#D2564B",
      wickUpColor: "#0E9E68",
      wickDownColor: "#D2564B",
    });
    const vol = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
      color: "rgba(14,124,85,0.18)",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    chartRef.current = chart;
    seriesRef.current = series;
    volRef.current = vol;

    const initial = useStore.getState().bySymbol(symbol)?.candles ?? [];
    series.setData(
      initial.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })),
    );
    vol.setData(
      initial.map((c) => ({ time: c.time as UTCTimestamp, value: c.volume, color: c.close >= c.open ? "rgba(14,158,104,0.16)" : "rgba(210,86,75,0.16)" })),
    );
    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol]);

  // live-update the last bar
  useEffect(() => {
    if (!candles || !seriesRef.current || !volRef.current) return;
    const last = candles[candles.length - 1];
    seriesRef.current.update({ time: last.time as UTCTimestamp, open: last.open, high: last.high, low: last.low, close: last.close });
    volRef.current.update({ time: last.time as UTCTimestamp, value: last.volume, color: last.close >= last.open ? "rgba(14,158,104,0.16)" : "rgba(210,86,75,0.16)" });
  }, [candles]);

  return <div ref={containerRef} className="w-full h-full" />;
}
