import React, { useEffect, useState } from "react";
import { renderToString } from "react-dom/server";
import ReactTooltip from "react-tooltip";
import LoadingOverlay from "../src/components/LoadingOverlay";

const Yes = () => <div className="centered-flex">✅</div>;
const No = () => <div className="centered-flex">❌</div>;
const C = ({ children }) => <div className="centered-flex">{children}</div>;
const R = ({ children }) => (
  <div style={{ textAlign: "right", fontFamily: "monospace" }}>{children}</div>
);

const TestResult = ({ result, detailedUrl, type }) => {
  const ToolTip = (
    <span>
      {`${type} contract verification for the chain failed`}
      <br />
      See{" "}
      <a target="_blank" rel="noreferrer" href={detailedUrl}>
        CI test run for details
      </a>
    </span>
  );
  if (result === true)
    return (
      <div
        className="centered-flex"
        data-tip={`${type} contract verification for the chain working`}
      >
        ✅
      </div>
    );
  if (result === false)
    return (
      <>
        <ReactTooltip
          effect="solid"
          delayHide={500}
          clickable={true}
          id="failed-test"
        />
        <div
          className="centered-flex"
          data-html={true}
          data-tip={renderToString(ToolTip)}
          data-for="failed-test"
        >
          ❌
        </div>
      </>
    );
  if (result === undefined)
    return (
      <div
        className="centered-flex"
        data-tip="No tests were given for this chain"
      >
        🤷
      </div>
    );
};

const Table = () => {
  const [sourcifyChains, setSourcifyChains] = useState();
  const [error, setError] = useState();
  const [testReportObject, setTestReportObject] = useState();
  const [testMap, setTestMap] = useState();

  useEffect(() => {
    fetch("https://sourcify.dev/server/chains")
      .then((res) => res.json())
      .then((chains) => setSourcifyChains(chains))
      .catch((err) =>
        setError(
          "Error fetching chains from the Sourcify server\n\n" + err.message
        )
      );
    // fetch("http://localhost:5000/chain-tests")
    fetch("https://sourcify.dev/server/chain-tests")
      .then((data) => data.json())
      .then((json) => {
        const testMap = formatRawTestReport(json.testReport);
        setTestMap(testMap);
        setTestReportObject(json);
      })
      .catch((err) => setError("Error fetching chain tests\n\n" + err.message));
  }, []);

  // Takes the raw mochawesome test report .json and formats with the result of the standard and immutable contract verification for each chain.
  const formatRawTestReport = (rawReport) => {
    const testsArr = rawReport.results[0].suites[0].tests;
    const testMap = {};
    testsArr.forEach((test) => {
      const context = JSON.parse(test.context);
      const chainId = context.value.chainId;
      const testType = context.value.testType; // either "normal" or "immutable"
      if (!testMap[chainId]) testMap[chainId] = {};
      testMap[chainId][testType] = test.pass;
    });
    return testMap;
  };

  if (error) {
    return error;
  }

  if (!sourcifyChains) {
    return (
      <div style={{ margin: "8rem" }}>
        <LoadingOverlay message="Loading Sourcify chains" />
      </div>
    );
  }
  if (!testMap || !testReportObject) {
    return (
      <div style={{ margin: "8rem" }}>
        <LoadingOverlay message="Loading chain verification tests" />
      </div>
    );
  }

  const testRunCircleURL = `https://app.circleci.com/pipelines/github/ethereum/sourcify/${testReportObject.pipelineNumber}/workflows/${testReportObject.workflowId}/jobs/${testReportObject.jobNumber}`;
  const testReportHtmlURL = `https://dl.circleci.com/private/output/job/${testReportObject.jobId}/artifacts/0/chain-tests-report/report.html`;

  const rows = sourcifyChains.map((chain, i) => {
    return (
      <tr key={`chain-row-${i}`}>
        <td>{chain.title || chain.name}</td>
        <td>
          <R>{chain.chainId}</R>
        </td>
        <td>{chain.supported ? <Yes /> : <No />}</td>
        <td>{chain.monitored ? <Yes /> : <No />}</td>
        <td>
          {
            <TestResult
              detailedUrl={testRunCircleURL}
              type="Standard"
              result={testMap[chain.chainId] && testMap[chain.chainId].normal}
            />
          }
        </td>
        <td>
          {
            <TestResult
              detailedUrl={testRunCircleURL}
              type="Immutable"
              result={
                testMap[chain.chainId] && testMap[chain.chainId].immutable
              }
            />
          }
        </td>
      </tr>
    );
  });
  return (
    <>
      <p>
        You can check out the complete{" "}
        <a target="_blank" rel="noreferrer" href={testReportHtmlURL}>
          HTML report
        </a>{" "}
        and the{" "}
        <a target="_blank" rel="noreferrer" href={testRunCircleURL}>
          detailed CI output
        </a>{" "}
        of the chain tests.
      </p>
      <ReactTooltip effect="solid" />
      <table>
        <thead>
          <tr>
            <th rowSpan={2}>Chain</th>
            <th rowSpan={2}>Chain ID</th>
            <th colSpan={2}>Support Type</th>
            <th colSpan={2}>Verification Tests</th>
          </tr>
          <tr style={{ backgroundColor: "var(--ifm-background-color)" }}>
            <th>Verification*</th>
            <th>Monitoring**</th>
            <th>Standard</th>
            <th>Immutables</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </>
  );
};

export default Table;
