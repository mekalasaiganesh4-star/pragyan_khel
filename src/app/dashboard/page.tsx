"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Upload, Play, AlertCircle, CheckCircle2, FileVideo, History, Activity, AlertTriangle, Image as ImageIcon, Target } from "lucide-react";
import { detectMotionInconsistencies, type DetectMotionInconsistenciesOutput } from "@/ai/flows/detect-motion-inconsistencies-flow";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";

type BallTracking = {
  isDetected: boolean;
  x?: number;
  y?: number;
};

type AnalysisResult = {
  frameNumber: number;
  timestamp: string;
  classification: "Normal" | "Frame Drop" | "Frame Merge";
  confidence: number;
  reasoning: string;
  frameDataUri: string;
  ballTracking?: BallTracking;
};

type VideoFrame = {
  timestamp: string;
  dataUri: string;
};

export default function Dashboard() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [previewFrames, setPreviewFrames] = useState<VideoFrame[]>([]);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setResults([]);
      setPreviewFrames([]);
      setProgress(0);
    }
  };

  const captureFrame = (video: HTMLVideoElement): string => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  };

  const extractPreviewFrames = async () => {
    if (!videoRef.current || !videoUrl || isExtracting) return;
    setIsExtracting(true);
    const video = videoRef.current;
    
    if (video.readyState < 1) {
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });
    }

    const duration = video.duration;
    const frameCount = 12;
    const interval = duration / frameCount;
    const frames: VideoFrame[] = [];

    for (let i = 0; i < frameCount; i++) {
      video.currentTime = i * interval;
      await new Promise((resolve) => {
        video.onseeked = resolve;
      });
      frames.push({
        timestamp: (i * interval).toFixed(2),
        dataUri: captureFrame(video),
      });
    }
    setPreviewFrames(frames);
    setIsExtracting(false);
  };

  const runAnalysis = async () => {
    if (!videoRef.current || !videoUrl) return;
    setIsAnalyzing(true);
    setResults([]);
    setProgress(0);

    const video = videoRef.current;
    const duration = video.duration;
    const frameCount = 10;
    const interval = duration / frameCount;

    const analyzedResults: AnalysisResult[] = [];
    let previousFrameUri = "";

    for (let i = 0; i < frameCount; i++) {
      video.currentTime = i * interval;
      await new Promise((resolve) => {
        video.onseeked = resolve;
      });

      const currentFrameUri = captureFrame(video);
      
      if (previousFrameUri) {
        try {
          const aiResult = await detectMotionInconsistencies({
            previousFrameDataUri: previousFrameUri,
            currentFrameDataUri: currentFrameUri,
            frameNumber: i,
          });

          analyzedResults.push({
            frameNumber: i,
            timestamp: (i * interval).toFixed(3),
            classification: aiResult.classification,
            confidence: aiResult.confidence,
            reasoning: aiResult.reasoning,
            frameDataUri: currentFrameUri,
            ballTracking: aiResult.ballTracking,
          });
        } catch (error) {
          console.error("AI Analysis failed for frame", i, error);
        }
      } else {
        analyzedResults.push({
          frameNumber: 0,
          timestamp: "0.000",
          classification: "Normal",
          confidence: 1,
          reasoning: "Baseline frame.",
          frameDataUri: currentFrameUri,
          ballTracking: { isDetected: false },
        });
      }

      previousFrameUri = currentFrameUri;
      setProgress(((i + 1) / frameCount) * 100);
      setResults([...analyzedResults]);
    }

    setIsAnalyzing(false);
  };

  const stats = {
    total: results.length,
    drops: results.filter((r) => r.classification === "Frame Drop").length,
    merges: results.filter((r) => r.classification === "Frame Merge").length,
    normal: results.filter((r) => r.classification === "Normal").length,
    ballHits: results.filter((r) => r.ballTracking?.isDetected).length,
  };

  const chartData = results.map((r) => ({
    frame: r.frameNumber,
    confidence: r.confidence * 100,
  }));

  const trajectoryPoints = results
    .filter(r => r.ballTracking?.isDetected && r.ballTracking.x !== undefined && r.ballTracking.y !== undefined)
    .map(r => ({ x: r.ballTracking!.x!, y: r.ballTracking!.y!, frame: r.frameNumber }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Temporal Vision</h1>
          <p className="text-muted-foreground font-body">Detect frame inconsistencies and track trajectory paths.</p>
        </div>
        <div className="flex gap-3">
          <input
            type="file"
            id="video-upload"
            className="hidden"
            accept="video/*"
            onChange={handleFileUpload}
          />
          <Button variant="outline" onClick={() => document.getElementById("video-upload")?.click()} className="rounded-full">
            <Upload className="mr-2 h-4 w-4" /> Upload Video
          </Button>
          <Button 
            onClick={runAnalysis} 
            disabled={!videoUrl || isAnalyzing} 
            className="bg-primary text-white hover:bg-primary/90 rounded-full"
          >
            {isAnalyzing ? "Analyzing..." : "Run Analysis"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden border-none shadow-xl bg-card">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="text-xl font-headline flex items-center gap-2">
              <FileVideo className="h-5 w-5 text-primary" />
              Trajectory Inspector
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative aspect-video bg-black flex items-center justify-center">
            {videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="max-h-full w-full"
                  crossOrigin="anonymous"
                  onLoadedMetadata={extractPreviewFrames}
                />
                <canvas ref={canvasRef} className="hidden" />
                {/* Trajectory Overlay */}
                <svg className="absolute inset-0 pointer-events-none w-full h-full">
                  {trajectoryPoints.length > 1 && trajectoryPoints.map((point, idx) => {
                    if (idx === 0) return null;
                    const prev = trajectoryPoints[idx - 1];
                    return (
                      <line
                        key={idx}
                        x1={`${prev.x * 100}%`}
                        y1={`${prev.y * 100}%`}
                        x2={`${point.x * 100}%`}
                        y2={`${point.y * 100}%`}
                        stroke="hsl(var(--accent))"
                        strokeWidth="3"
                        strokeDasharray="5,5"
                        className="animate-in fade-in duration-500"
                      />
                    );
                  })}
                  {trajectoryPoints.map((point, idx) => (
                    <circle
                      key={idx}
                      cx={`${point.x * 100}%`}
                      cy={`${point.y * 100}%`}
                      r="6"
                      fill="hsl(var(--accent))"
                      className="animate-pulse"
                    />
                  ))}
                </svg>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-white/50">
                <FileVideo className="h-12 w-12" />
                <p>No video selected for analysis</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-headline">Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total Frames</p>
                  <p className="text-2xl font-bold text-primary">{stats.total}</p>
                </div>
                <div className="p-4 bg-background rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Ball Tracked</p>
                  <p className="text-2xl font-bold text-accent">{stats.ballHits}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Normal Frames</span>
                  <span className="font-bold">{stats.normal}</span>
                </div>
                <Progress value={stats.total ? (stats.normal / stats.total) * 100 : 0} className="h-2" />
                <div className="flex justify-between text-sm pt-2">
                  <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-destructive" /> Drops</span>
                  <span className="font-bold text-destructive">{stats.drops}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" /> Merges</span>
                  <span className="font-bold text-amber-500">{stats.merges}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {isAnalyzing && (
            <Card className="border-none shadow-lg animate-pulse bg-primary/5">
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <Activity className="h-8 w-8 text-primary animate-spin" />
                  <div className="space-y-2 w-full">
                    <p className="font-headline font-bold">Plotting Trajectory</p>
                    <p className="text-xs text-muted-foreground">Identifying motion vectors and ball path...</p>
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Tabs defaultValue="report" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-6 rounded-full p-1 bg-muted">
          <TabsTrigger value="report" className="rounded-full data-[state=active]:bg-white">Detailed Report</TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-full data-[state=active]:bg-white">Motion Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="report" className="space-y-6">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline">
                {results.length > 0 ? "Frame-by-Frame Tracking" : "Video Frame Gallery"}
              </CardTitle>
              <CardDescription>
                {results.length > 0 
                  ? "Results from temporal consistency and trajectory analysis." 
                  : "Previewing frames from the uploaded video stream."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                {results.length === 0 ? (
                  <div className="space-y-6">
                    {previewFrames.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {previewFrames.map((frame, idx) => (
                          <div key={idx} className="group relative aspect-video rounded-xl overflow-hidden border border-border bg-muted">
                            <img 
                              src={frame.dataUri} 
                              alt={`Frame at ${frame.timestamp}s`} 
                              className="object-cover w-full h-full transition-transform group-hover:scale-110" 
                            />
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-2 text-[10px] text-white font-code flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span>FRAME PREVIEW</span>
                              <span>{frame.timestamp}s</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-4">
                        {isExtracting ? (
                          <>
                            <Activity className="h-8 w-8 animate-spin text-primary" />
                            <p>Extracting video frames...</p>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-10 w-10 opacity-20" />
                            <p>Upload a video to see frame data.</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {results.map((result, idx) => (
                      <div key={idx} className="group p-4 rounded-2xl border border-border bg-card hover:border-primary transition-all">
                        <div className="flex items-start gap-4">
                          <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <img src={result.frameDataUri} alt={`Frame ${result.frameNumber}`} className="object-cover w-full h-full" />
                            {result.ballTracking?.isDetected && result.ballTracking.x !== undefined && result.ballTracking.y !== undefined && (
                              <div 
                                className="absolute w-4 h-4 border-2 border-accent rounded-full -translate-x-1/2 -translate-y-1/2"
                                style={{ 
                                  left: `${result.ballTracking.x * 100}%`, 
                                  top: `${result.ballTracking.y * 100}%` 
                                }}
                              >
                                <div className="absolute inset-0 bg-accent/30 animate-ping rounded-full" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-code text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">F#{result.frameNumber}</span>
                                <span className="font-code text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{result.timestamp}s</span>
                                {result.classification === "Normal" ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Normal</Badge>
                                ) : result.classification === "Frame Drop" ? (
                                  <Badge className="bg-destructive/10 text-destructive border-destructive/20"><AlertCircle className="h-3 w-3 mr-1" /> Frame Drop</Badge>
                                ) : (
                                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><AlertTriangle className="h-3 w-3 mr-1" /> Frame Merge</Badge>
                                )}
                                {result.ballTracking?.isDetected && (
                                  <Badge variant="outline" className="border-accent text-accent bg-accent/5">
                                    <Target className="h-3 w-3 mr-1" /> Ball Detected
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs font-bold text-primary">{(result.confidence * 100).toFixed(0)}% Conf.</span>
                            </div>
                            <p className="text-sm font-body leading-relaxed text-muted-foreground">{result.reasoning}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="timeline">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline">Motion Confidence Chart</CardTitle>
              <CardDescription>Probability of temporal consistency over time.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {results.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4B0082" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4B0082" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="frame" 
                      label={{ value: 'Frame Number', position: 'insideBottomRight', offset: -10 }} 
                    />
                    <YAxis 
                      label={{ value: 'Confidence %', angle: -90, position: 'insideLeft' }} 
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="confidence" 
                      stroke="#4B0082" 
                      fillOpacity={1} 
                      fill="url(#colorConf)" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground italic">
                  Run analysis to generate visualization.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
