d3.json("https://raw.githubusercontent.com/AI-metrics/AI-metrics/master/export-api/v01/progress.json", function (data) {

    var solved_dates = getSolvedDates(data.problems);

    var parentList = d3.select("#hierachy").append("ul");

    for (var i = 0; i < data.problems.length; i++) {
        var problem = data.problems[i];
        if (problem["superproblems"].length == 0) {
            printProblemAndChildren(data.problems, problem.name, solved_dates, parentList, 0)
        }
    }
});

function getSolvedDates(problems) {

    var high_is_better = ["Score", "Score (Rewards Normalized)", "Percentage correct", "ELO rating", "BLEU score"];
    var low_is_better = ["Percentage error", "Error rate", "Model Entropy", "Perplexity"];

    var solved_dates = [];
    for (var i = 0; i < problems.length; i++) {
        var problem = problems[i];

        for (var j = 0; j < problem.metrics.length; j++) {
            var metric = problem.metrics[j];

            var scale = metric.scale;
            var metric_solved_date = "";

            for (var k = 0; k < metric.measures.length; k++) {
                var measure = metric.measures[k];

                if ((high_is_better.indexOf(scale) != -1 && measure["value"] >= metric["target"]) || (low_is_better.indexOf(scale) != -1 && measure["value"] <= metric["target"])) {
                    if (metric["target"] && (!metric_solved_date || (measure["date"] < metric_solved_date))) {
                        metric_solved_date = measure["date"]
                    }
                }
            }

            if (metric["solved"] && !metric_solved_date) {
                metric_solved_date = "solved"
            } else if (metric_solved_date) {
                metric_solved_date = "solved " + metric_solved_date
            }

            solved_dates[metric.name] = metric_solved_date;
        }
    }
    return solved_dates;
}

function printProblemAndChildren(problems, problem_name, solved_dates, parentList, level) {
    var problem = problems.filter(function (d) {
        return d.name == problem_name;
    })[0];

    var thisList = parentList.append("ul").append("li").text(problem.name);
    if (level == 0) {
        thisList.style("margin-top", "15px")
            .style("list-style-type", "none");
    } else if (level == 1) {
        thisList.style("margin-top", "3px");

    }

    if (problem.metrics) {
        var metricList = thisList.append("ul");

        var metric_items = metricList.selectAll("li")
            .data(problem.metrics)
            .enter()
            .append("li")
            .classed("metric", true)
            .text(function (d) {
                return d.name
            })
            .on("click", function (d) {
                d3.selectAll("li").classed("selected-metric", false);
                d3.select(this).classed("selected-metric", true);
                setDetailTask(d);
            });

        metric_items.filter(function (d) {
            return solved_dates[d.name];
        })
            .append("span").style("color", "green")
            .text(function (d) {
                return " (" + solved_dates[d.name] + ")";
            });

        metric_items.filter(function (d) {
            return !solved_dates[d.name];
        })
            .append("span").style("color", "red")
            .text(" (unsolved) ")

    }

    if (problem.subproblems) {
        for (var j = 0; j < problem.subproblems.length; j++) {
            printProblemAndChildren(problems, problem.subproblems[j], solved_dates, thisList, level + 1);
        }
    }

}


function setDetailTask(metric) {
    d3.select("#graph-pane").select("h3").text(metric.name);
    drawGraph(metric);
    drawTable(metric);
}


function highlightName(index) {
    d3.select("#table").selectAll("tr").classed("selected-row", false);
    d3.select("#graph").selectAll("circle").style("fill", "blue");

    d3.select("#table").selectAll("tbody").selectAll("tr").filter(function (d, i) {
        return i == index;
    }).classed("selected-row", true);
    d3.select("#graph").selectAll("circle").filter(function (d, i) {
        return i == index;
    }).style("fill", "#FFCC00")
}


function drawGraph(metric) {

    var totalWidth = document.getElementById("graph").offsetWidth;

    var margin = {top: 20, right: 20, bottom: 30, left: 40},
        width = totalWidth - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    d3.select("#graph").selectAll("svg").remove();
    var svg = d3.select("#graph").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    var data = metric["measures"];

    x.domain(d3.extent(data, function (d) {
        return new Date(d.date);
    })).nice();

    var y_domain = d3.extent(data, function (d) {
        return d.value;
    });
    if (metric.target > y_domain[1]) {
        y_domain[1] = metric.target;
    } else if (metric.target < y_domain[0]) {
        y_domain[0] = metric.target;
    }
    y.domain(y_domain).nice();


    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("Date");

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(metric["scale"]);


    svg.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 3.5)
        .attr("cx", function (d) {
            return x(new Date(d.date));
        })
        .attr("cy", function (d) {
            return y(d.value);
        })
        .style("fill", "blue")
        .on("mouseover", function (d, i) {
            highlightName(i);
        })
        .append("title").text(function(d){return d.value + " (" + d.name + ")"});

    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(metric["target"]))
        .attr("y2", y(metric["target"]))
        .classed("target", true);

    svg.append("text")
        .attr("class", "label")
        .attr("x", width - 20)
        .attr("y", y(metric["target"]) - 10)
        .style("text-anchor", "end")
        .text(metric["target_label"])
}


function drawTable(metric) {
    d3.select("#table").selectAll("table").remove();

    var table = d3.select("#table").append("table").classed("table", "true").classed("table-condensed", "true");

    var thead = table.append("thead").append("tr");
    thead.append("th").text("Name");
    thead.append("th").text(metric["scale"]);
    thead.append("th").text("Date");
    thead.append("th").text("Reference");


    var tbody = table.append("tbody");

    var target_row = table.select("thead").append("tr");

    target_row.append("td").append("b").text(metric.target_label);
    target_row.append("td").append("b").text(metric.target);
    target_row.append("td").text("");
    target_row.append("td").append("a").attr("href", metric.target_source).text("source");


    var rows = tbody
        .selectAll("tr")
        .data(metric["measures"])
        .enter()
        .append("tr");

    rows.append("td").text(function (d) {
        return d.name
    });
    rows.append("td").text(function (d) {
        return d.value
    });
    rows.append("td").text(function (d) {
        return d.date
    });
    rows.append("td").append("a").attr("href", function (d) {
        return d.url
    }).text(function (d) {
        return d.papername
    });

    rows.on("mouseover", function (d, i) {
        highlightName(i)
    });
}
