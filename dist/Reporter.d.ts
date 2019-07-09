import * as pitometer from '../../../pitometer';
export declare class Reporter {
    constructor();
    static replaceAll(originalString: any, find: any, replace: any): any;
    /**
     *
     * @param reportSeries
     * @param seriesName e.g: value, upperSevere, ...
     * @param color color code
     * @param testRunId testrun_x
     * @param value the actual value or null
     */
    static addTimeseries(reportSeries: any, seriesName: any, color: any, testRunId: any, value: any): any;
    /**
     * Iterates over the runResults and returns a JSON String that can be used in an HTML document to be visualized with HighCharts
     * @param runResults
     */
    generateTimeseriesForReport(runResults: pitometer.IRunResult[]): object;
    /**
     *
     * @param mainReport
     * @param seriesTemplate
     * @param seriesPlaceholder
     * @param timeseriesData
     */
    generateHtmlReport(mainReport: string, seriesTemplate: string, seriesPlaceholder: string, timeseriesData: any): string;
}
