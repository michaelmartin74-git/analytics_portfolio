import React, { lazy, Suspense } from 'react';

// 1. Dynamically resolve Plotly before building the component wrapper
const PlotlyComponent = lazy(async () => {
  const [ReactModule, PlotlyModule, FactoryModule] = await Promise.all([
    import('react'),
    import('plotly.js-dist-min'),
    import('react-plotly.js/factory'),
  ]);

  const ReactLib = ReactModule.default || ReactModule;
  const createPlotComponent = FactoryModule.default || FactoryModule;

  let PlotlyObj = PlotlyModule.default || PlotlyModule;
  if (PlotlyObj.default && typeof PlotlyObj.default.purge === 'function') {
    PlotlyObj = PlotlyObj.default;
  }

  return {
    default: createPlotComponent(ReactLib, PlotlyObj),
  };
});

// 2. Main Wrapper Component
export function ReactPlot({ data, layout, config }) {
  return (
    <Suspense fallback={<div style={{ height: layout?.height || 200 }}>Loading Chart...</div>}>
      <PlotlyComponent
        data={data}
        layout={layout}
        config={{ responsive: true, displayModeBar: false, ...config }}
      />
    </Suspense>
  );
}