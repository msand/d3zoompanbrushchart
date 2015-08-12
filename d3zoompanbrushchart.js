/*global d3, window, define, module */
(function () {
    'use strict';

    function dataSeriesExtent(data, accessor) {
        return d3.extent(d3.merge(data.map(function (series) {
            return d3.extent(series, function (datum) {
                return datum[accessor];
            });
        })));
    }

    function constructGraph(svg, width, height, xAxis, margin, yAxis, data, svgLine) {
        svg.append('clipPath')
            .attr('id', 'clip')
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', width)
            .attr('height', height);

        svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis);

        svg.append('text')
            .attr('x', (width / 2))
            .attr('y', height + margin.bottom)
            .style('text-anchor', 'middle')
            .text('Date');

        svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis);

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 5)
            .attr('x', -height / 2)
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text('Value');

        var lineGroup = svg.append('g')
            .attr('class', 'lineGroup')
            .attr('clip-path', 'url(#clip)');

        lineGroup.selectAll('path.line')
            .data(data)
            .enter()
            .append('path')
            .attr('class', 'line')
            .attr('d', svgLine);

        return lineGroup;
    }

    function update(lineGroup, data, svgLine) {
        var sel = lineGroup.selectAll('path.line').data(data);

        sel.enter().append('path').attr('class', 'line');

        sel.transition().attr('d', svgLine);

        sel.exit().transition().remove();
    }

    function d3ZoomPanBrushChart(options) {
        options = options || {};

        if (!options.parent || !options.parent.getBoundingClientRect) {
            throw new Error('No parent container defined');
        }

        var parent = options.parent;
        parent.innerHTML = '';

        var rect = parent.getBoundingClientRect(),
            w = options.width || rect.width || 960,
            h = options.height || rect.height || 500;

        h = Math.min(h, window.document.documentElement.clientHeight - 10);

        var brushHeight = options.brushHeight || 200,
            margin = options.margin || {top: 40, right: 50, bottom: 40, left: 60},
            height = h - margin.top - margin.bottom - brushHeight,
            width = w - margin.left - margin.right,
            brushWidth = width,
            brushMargin = {
                top: h - brushHeight + margin.top / 4,
                right: margin.right,
                bottom: margin.bottom,
                left: margin.left
            };

        brushHeight -= margin.bottom + margin.top / 4;

        var data = options.data || [];
        var yAccessor = options.yAccessor || 'value';
        var xAccessor = options.xAccessor || 'date';
        var xExtent = dataSeriesExtent(data, xAccessor);
        var yExtent = dataSeriesExtent(data, yAccessor);

        function makeScalesAxesAndLine(width, height) {
            var x = d3.time.scale()
                .domain(xExtent)
                .range([0, width]);

            var y = d3.scale.linear()
                .domain(yExtent)
                .range([height, 0]);

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient('bottom')
                .tickSize(-height)
                .tickPadding(8);

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient('left')
                .tickSize(-width);

            var svgLine = d3.svg.line()
                .interpolate('cardinal')
                .x(function (d) {
                    return x(d[xAccessor]);
                })
                .y(function (d) {
                    return y(d[yAccessor]);
                });

            return {x: x, y: y, xAxis: xAxis, yAxis: yAxis, svgLine: svgLine};
        }

        var graphComponents = makeScalesAxesAndLine(width, height);
        var x = graphComponents.x;
        var y = graphComponents.y;
        var xAxis = graphComponents.xAxis;
        var yAxis = graphComponents.yAxis;
        var svgLine = graphComponents.svgLine;

        var brushComponents = makeScalesAxesAndLine(brushWidth, brushHeight);
        var x2 = brushComponents.x;
        var y2 = brushComponents.y;
        var xAxis2 = brushComponents.xAxis;
        var yAxis2 = brushComponents.yAxis;
        var svgLine2 = brushComponents.svgLine;

        var zoom = d3.behavior.zoom()
            .x(x)
            .y(y)
            .on('zoom', onZoom);

        var brush = d3.svg.brush()
            .x(x2)
            .y(y2)
            .on('brush', onBrush);

        var root = d3.select(parent)
            .append('svg')
            .attr('width', w)
            .attr('height', h);

        var svg = root
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
            .call(zoom);

        var brushG = root
            .append('g')
            .attr('transform', 'translate(' + brushMargin.left + ',' + brushMargin.top + ')');

        var lineGroup = constructGraph(svg, width, height, xAxis, margin, yAxis, data, svgLine);

        var brushLineG = constructGraph(brushG, brushWidth, brushHeight, xAxis2, brushMargin, yAxis2, data, svgLine2);

        brushG.append('g')
            .attr('class', 'x brush')
            .call(brush);

        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -margin.top / 3)
            .attr('text-anchor', 'middle')
            .style('text-decoration', 'underline')
            .text('Value vs Date Graph');

        var updating = false;

        function onZoom() {
            svg.select('.x.axis').call(xAxis);
            svg.select('.y.axis').call(yAxis);

            var xd = x.domain();
            var yd = y.domain();
            var xMin = xd[0];
            var xMax = xd[1];
            var yMin = yd[0];
            var yMax = yd[1];

            if (xMin >= xExtent[0] && xMax <= xExtent[1] && yMin >= yExtent[0] && yMax <= yExtent[1]) {
                brush.extent([
                    [xMin, yMin],
                    [xMax, yMax]
                ]);
            } else {
                brush.clear();
            }

            if (updating) {
                updating = false;
                brush.clear();
            } else {
                lineGroup.selectAll('path.line').attr('d', svgLine);
            }

            brushG.select('g.brush').call(brush);
        }

        function onBrush() {
            var extent = brush.extent();

            x.domain(brush.empty()
                ? x2.domain()
                : [extent[0][0], extent[1][0]]);

            y.domain(brush.empty()
                ? y2.domain()
                : [extent[0][1], extent[1][1]]);

            lineGroup.selectAll('path.line').attr('d', svgLine);
            svg.select('.x.axis').call(xAxis);
            svg.select('.y.axis').call(yAxis);
            zoom.x(x).y(y);
        }

        function updateDataAndXYAccessor(data, xKey, yKey) {
            updating = true;

            if (xKey) {
                xAccessor = xKey;
            }
            if (yKey) {
                yAccessor = yKey;
            }

            xExtent = dataSeriesExtent(data, xAccessor);
            yExtent = dataSeriesExtent(data, yAccessor);

            x2.domain(xExtent);
            y2.domain(yExtent);

            brushG.select('.x.axis').call(xAxis2);
            brushG.select('.y.axis').call(yAxis2);

            svg.call(zoom
                .x(x.domain(xExtent))
                .y(y.domain(yExtent))
                .event);

            update(lineGroup, data, svgLine);

            update(brushLineG, data, svgLine2);
        }

        return updateDataAndXYAccessor;
    }

    if (typeof define === "function" && define.amd) {
        define(d3ZoomPanBrushChart);
    } else if (typeof module === "object" && module.exports) {
        module.exports = d3ZoomPanBrushChart;
    }
    if (typeof window === 'object') {
        window.d3ZoomPanBrushChart = d3ZoomPanBrushChart;
    }
}());
