import React, { useEffect, useState } from "react";
import { Button, Select, Input, Form as AntForm, Spin } from "antd";
import "./form.scss";
import { HiPaperAirplane } from "react-icons/hi";
import toast, { Toaster } from "react-hot-toast";
import { FaDownload } from "react-icons/fa";
import Footer from "../Footer/Footer";

export default function Form() {
  const [isLoading, setIsLoading] = useState(false);
  const [sourceCode, setSourceCode] = useState(null);
  const [filePageDownloadLink, setFilePageDownloadLink] = useState(null);
  const [fileLink, setFileLink] = useState(null);
  const [fileTypeSelection, setFileTypeSelection] = useState("document");
  const [regexLink, setRegexLink] = useState(null);
  const [responseFileType, setResponseFileType] = useState(null);
  const [inputUrlValue, setInputUrlValue] = useState();
  const [pageIsLoading, setPageIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setPageIsLoading(false);
    }, 3000); // Change this time as needed
  }, []);

  const onFinish = () => {
    setResponseFileType(null);
    setSourceCode(null);
    if (inputUrlValue) {
      fetchSource();
    }
  };

  const handleDownload = (link) => {
    fetch(link)
      .then((response) => response.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank"; // Open in a new tab if needed
  
        // Dynamically generate the filename based on content type
        const extension = responseFileType === "video" ? "mp4" :
                          responseFileType === "document" ? "pdf" :
                          responseFileType === "image" ? "png" :
                          "";
        a.download = `file.${extension}`;
  
        document.body.appendChild(a); // Append to the document
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a); // Remove from the document
      })
      .catch((error) => {
        console.log("Download error:", error);
        toast.error("Download Error");
      });
  };

  async function fetchSource() {
    setIsLoading(true);
    try {
      var url = document.getElementById("urlInput").value;
      var response = await fetch(
        "https://api.allorigins.win/get?url=" + encodeURIComponent(url)
      );
      var data = await response.json();
      if (response.ok) {
        setSourceCode(data.contents);
        handleExtract(data.contents);
      }
    } catch (error) {
      setSourceCode("An error occurred while fetching link.");
      toast.error("An error occurred while fetching link.");
      console.error("error", error);
      setIsLoading(false);
    } finally {
      if (fileTypeSelection === "document") {
        setIsLoading(false);
      }
    }
  }

  const handleExtract = (code) => {
    let matches = code.match(regexLink);
    if (!matches && fileTypeSelection === "video") {
      matches = code.match(
        /{.*?"url":"https:\/\/dms\.licdn\.com\/playlist\/vid.*?}+/g
      );
    }
    if (matches) {
      if (fileTypeSelection === "video") {
        const videoUrl = JSON.parse(`${matches[0]}}`).sharedContent.url;
        fetchAndRenderFile(videoUrl);
        setFilePageDownloadLink(videoUrl);
        setInputUrlValue("");
      } else if (fileTypeSelection === "document") {
        setFilePageDownloadLink(JSON.parse(matches[1]).url);
        setInputUrlValue("");
      } else if (fileTypeSelection === "image") {
        fetchAndRenderFile(JSON.parse(matches[1]).url);
        setFilePageDownloadLink(JSON.parse(matches[1]).url);
        setInputUrlValue("");
      }
    } else {
      setInputUrlValue("");
      toast.error("Error: Check your link again, or try Private mode.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sourceCode) {
      if (fileTypeSelection === "document") {
        handleExtract(sourceCode);
      }
    }
  }, [sourceCode]);

  useEffect(() => {
    if (fileTypeSelection === "image") {
      setRegexLink(
        /{.*?"url":"https:\/\/media\.licdn\.com\/dms\/image\/.*?}+/g
      );
    } else if (fileTypeSelection === "video") {
      setRegexLink(
        /{.*?"url":"https:\/\/dms-exp2\.licdn\.com\/playlist\/vid.*?}+/g
      );
    }
  }, [fileTypeSelection]);

  useEffect(() => {
    if (filePageDownloadLink) {
      if (fileTypeSelection === "document") {
        fetchData();
      } else if (fileTypeSelection === "image") {
        fetchAndRenderFile(filePageDownloadLink);
      } else if (fileTypeSelection === "video") {
        fetchAndRenderFile(filePageDownloadLink);
      }
    }
  }, [filePageDownloadLink, fileTypeSelection]);

  const fetchData = async () => {
    const response = await fetch(filePageDownloadLink);
    const responseJson = await response.json();
    if (fileTypeSelection === "document") {
      setFileLink(responseJson.transcribedDocumentUrl);
      fetchAndRenderFile(responseJson.transcribedDocumentUrl);
    }
  };

  const fetchAndRenderFile = async (responseUrl) => {
    try {
      const response = await fetch(responseUrl);
      const contentType = response.headers.get("Content-Type");
      if (response.ok) {
        const fileBlob = await response.blob();
        const fileReader = new FileReader();
        fileReader.onloadend = async () => {
          const arrayBuffer = fileReader.result;
          const fileBytes = new Uint8Array(arrayBuffer);
          const fileSignature = getFileSignature(fileBytes);
          const detectedFileType = getFileTypeFromSignature(fileSignature);

          if (detectedFileType || contentType === "video/mp4") {
            const ext = detectedFileType ? detectedFileType.ext : "mp4";
            if (ext === "jpeg" || ext === "jpg" || ext === "png") {
              setIsLoading(false);
              setResponseFileType("image");
            } else if (ext === "pdf") {
              setIsLoading(false);
              setResponseFileType("document");
            } else if (
              ext === "mp4" ||
              ext === "mov" ||
              contentType === "video/mp4"
            ) {
              setResponseFileType("video");
              setIsLoading(false);
            } else {
              setResponseFileType(null);
              console.log("Unsupported file type");
              setIsLoading(false);
            }
          } else {
            console.log("File type detection failed");
            toast.error("File type detection failed");
            setIsLoading(false);
          }
        };
        fileReader.readAsArrayBuffer(fileBlob);
      }
    } catch (error) {
      console.error("Error fetching file:", error);
    }
  };

  const getFileSignature = (fileBytes) => {
    const signatureBytes = fileBytes.subarray(0, 4);
    return Array.from(signatureBytes)
      .map((byte) => byte.toString(16))
      .join("");
  };

  const getFileTypeFromSignature = (fileSignature) => {
    switch (fileSignature) {
      case "89504e47":
        return { ext: "png" };
      case "ffd8ffe0":
      case "ffd8ffe1":
      case "ffd8ffe2":
        return { ext: "jpeg" };
      case "25504446":
        return { ext: "pdf" };
      case "66747970":
        return { ext: "mp4" };
      case "00000018":
        return { ext: "mp4" };
      default:
        return null;
    }
  };

  function handleChange(value) {
    setFileTypeSelection(value);
  }

  return (
    <>
    {pageIsLoading ? (
        <div className="loading-page">
          <img className="loading-icon" src="https://cdn-icons-png.flaticon.com/512/145/145807.png" alt="Loading..." />
        </div>
      ) : (
        // Your main content
        <>
          {/* Rest of your code */}
          <Toaster position="bottom-center" reverseOrder={false} /><br /><br /><br /><br />
      <h1 className="title">Linkedin Post Downloader</h1>
      <div className="color-tag">
      
        <div className="form-container">
         
          <div className="form-child">
            <AntForm onFinish={onFinish} className="ant-form-element">
              <Input
                value={inputUrlValue}
                disabled={isLoading}
                onChange={(e) => setInputUrlValue(e.target.value)}
                type="text"
                id="urlInput"
                placeholder="Enter URL of Linkedin Post"
                className="ant-input-element"
              />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <Button
                type="primary"
                className="ant-form-btn"
                htmlType="submit"
                disabled={isLoading || !inputUrlValue}
              >
                <span className="icon-wrapper">
                  {isLoading ? (
                    <Spin className="btn-spinner" size="small" />
                  ) : (
                    <HiPaperAirplane className="icon" />
                  )}
                </span>
              </Button>
            </AntForm><br />
            <span style={{ color: "white"}}>Choose Which Type Of Post?</span>
            <Select
              className="ant-selector-element"
              defaultValue="document"
              onChange={handleChange}
              style={{ width: 150 }}
              loading={isLoading}
              disabled={isLoading}
              options={[
                {
                  value: "document",
                  label: "Document PDF",
                },
                {
                  value: "image",
                  label: "Image",
                },
                {
                  value: "video",
                  label: "Video",
                },
              ]}
            />
          </div>
          <div className="result-container-1">
          <div className="result-container">
            <div className="loading-container">
              {isLoading ? (
                <div className="loading">
                  <Spin size="large" />

                </div>
              ) : (
                ""
              )}
            </div>
            {responseFileType === "document" ? (
              <>
             
                <h1>Preview</h1>
                <iframe
                  className="result-element document"
                  src={fileLink}
                  title="Embedded PDF"
                  width="100%"
                  height="600px"
                />
                <Button
                  type="primary"
                  className="file-download-btn"
                  onClick={() => {
                    handleDownload(fileLink);
                  }}
                >
                  <FaDownload className="download-icon" /> Download
                </Button>
              </>
            ) : (
              ""
            )}
            {responseFileType === "image" ? (
              <>
              
                <h1>Preview</h1>
                <img
                  className="result-element"
                  src={filePageDownloadLink}
                  alt="Image Preview"
                  width="500"
                  height="600"
                />
                <Button
                  type="primary"
                  className="file-download-btn"
                  onClick={() => {
                    handleDownload(filePageDownloadLink);
                  }}
                >
                  <FaDownload className="download-icon" /> Download
                </Button>
              </>
            ) : (
              ""
            )}
            {responseFileType === "video" ? (
              <>
                <h1>Preview</h1>
                <br />
                <video controls className="result-element">
                  <source src={filePageDownloadLink} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <Button
                  type="primary"
                  className="file-download-btn"
                  onClick={() => {
                    handleDownload(filePageDownloadLink);
                  }}
                >
                  <FaDownload className="download-icon" /> Download
                </Button>
              </>
            ) : (
              ""
            )}
            
                
                </div>
          </div>
         
        </div>
        <div>
              <Footer />
            </div>
        </div>
        
        </>
      )}
      
      
    </>
  );
}
