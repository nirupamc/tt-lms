import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
  Globe,
  Link2,
} from "lucide-react";
import { format } from "date-fns";

export default function ReviewQueuePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [reviewedSubmissions, setReviewedSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review dialog state
  const [reviewDialog, setReviewDialog] = useState({
    open: false,
    action: null,
    submission: null,
  });
  const [feedback, setFeedback] = useState("");
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [activeTab]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      if (activeTab === "pending") {
        const { data, error } = await supabase.rpc("get_pending_reviews");
        if (error) throw error;
        setPendingSubmissions(data || []);
      } else {
        const status = activeTab === "passed" ? "passed" : "failed";
        const { data, error } = await supabase.rpc("get_reviewed_submissions", {
          p_status: status,
        });
        if (error) throw error;
        setReviewedSubmissions(data || []);
      }
    } catch (err) {
      console.error("Error fetching submissions:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load submissions",
      });
    } finally {
      setLoading(false);
    }
  };

  const openReviewDialog = (action, submission) => {
    setReviewDialog({ open: true, action, submission });
    setFeedback("");
  };

  const handleReview = async () => {
    if (reviewDialog.action === "reject" && !feedback.trim()) {
      toast({
        variant: "destructive",
        title: "Feedback required",
        description: "Please provide feedback for rejection",
      });
      return;
    }

    setReviewing(true);
    try {
      const rpcFunction =
        reviewDialog.action === "approve"
          ? "approve_milestone_submission"
          : "reject_milestone_submission";

      const { data, error } = await supabase.rpc(rpcFunction, {
        p_submission_id: reviewDialog.submission.submission_id,
        p_reviewer_id: user.id,
        p_feedback: feedback.trim() || null,
      });

      if (error) throw error;

      toast({
        title: reviewDialog.action === "approve" ? "Submission approved" : "Submission rejected",
        description:
          reviewDialog.action === "approve"
            ? "Employee can now progress to the next module"
            : "Employee has been notified to resubmit",
      });

      setReviewDialog({ open: false, action: null, submission: null });
      setFeedback("");
      fetchSubmissions();
    } catch (err) {
      console.error("Error reviewing submission:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    } finally {
      setReviewing(false);
    }
  };

  const renderPendingTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Module</TableHead>
          <TableHead>Course</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead>Links</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pendingSubmissions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
              No pending submissions
            </TableCell>
          </TableRow>
        ) : (
          pendingSubmissions.map((submission) => (
            <TableRow key={submission.submission_id}>
              <TableCell>
                <div>
                  <p className="font-medium">{submission.employee_name}</p>
                  <p className="text-xs text-muted-foreground">{submission.employee_email}</p>
                </div>
              </TableCell>
              <TableCell>
                <p className="font-medium">{submission.module_title}</p>
              </TableCell>
              <TableCell>
                <p className="text-sm text-muted-foreground">{submission.course_title}</p>
              </TableCell>
              <TableCell>
                <p className="text-sm">
                  {format(new Date(submission.submitted_at), "MMM d, yyyy")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(submission.submitted_at), "h:mm a")}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {submission.github_url && (
                    <a
                      href={submission.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs hover:underline text-indigo-600"
                    >
                      <Link2 className="w-3 h-3" />
                      GitHub
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {submission.hosted_url && (
                    <a
                      href={submission.hosted_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs hover:underline text-indigo-600"
                    >
                      <Globe className="w-3 h-3" />
                      Demo
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => openReviewDialog("approve", submission)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openReviewDialog("reject", submission)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const renderReviewedTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Module</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead>Reviewed By</TableHead>
          <TableHead>Reviewed At</TableHead>
          <TableHead>Feedback</TableHead>
          <TableHead>Links</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reviewedSubmissions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              No {activeTab} submissions yet
            </TableCell>
          </TableRow>
        ) : (
          reviewedSubmissions.map((submission) => (
            <TableRow key={submission.submission_id}>
              <TableCell>
                <div>
                  <p className="font-medium">{submission.employee_name}</p>
                  <p className="text-xs text-muted-foreground">{submission.employee_email}</p>
                </div>
              </TableCell>
              <TableCell>
                <p className="font-medium text-sm">{submission.module_title}</p>
                <p className="text-xs text-muted-foreground">{submission.course_title}</p>
              </TableCell>
              <TableCell>
                <p className="text-sm">
                  {format(new Date(submission.submitted_at), "MMM d, yyyy")}
                </p>
              </TableCell>
              <TableCell>
                <p className="text-sm">{submission.reviewer_name || "N/A"}</p>
              </TableCell>
              <TableCell>
                <p className="text-sm">
                  {submission.reviewed_at
                    ? format(new Date(submission.reviewed_at), "MMM d, yyyy")
                    : "N/A"}
                </p>
              </TableCell>
              <TableCell>
                <p className="text-sm max-w-xs truncate">
                  {submission.feedback || "No feedback"}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {submission.github_url && (
                    <a
                      href={submission.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <Link2 className="w-4 h-4" />
                    </a>
                  )}
                  {submission.hosted_url && (
                    <a
                      href={submission.hosted_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Review Queue</h1>
            <p className="text-muted-foreground mt-1">
              Review and approve milestone project submissions
            </p>
          </div>
          <Button onClick={fetchSubmissions} variant="outline">
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingSubmissions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeTab === "passed" ? reviewedSubmissions.length : "-"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeTab === "failed" ? reviewedSubmissions.length : "-"}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingSubmissions.length})</TabsTrigger>
            <TabsTrigger value="passed">Approved</TabsTrigger>
            <TabsTrigger value="failed">Rejected</TabsTrigger>
          </TabsList>

          <Card className="mt-4">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <TabsContent value="pending" className="mt-0">
                    {renderPendingTable()}
                  </TabsContent>
                  <TabsContent value="passed" className="mt-0">
                    {renderReviewedTable()}
                  </TabsContent>
                  <TabsContent value="failed" className="mt-0">
                    {renderReviewedTable()}
                  </TabsContent>
                </>
              )}
            </CardContent>
          </Card>
        </Tabs>
      </motion.div>

      {/* Review Dialog */}
      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) =>
          setReviewDialog({ ...reviewDialog, open })
        }
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === "approve" ? "Approve Submission" : "Reject Submission"}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.submission && (
                <div className="mt-2 space-y-2">
                  <p>
                    <strong>Employee:</strong> {reviewDialog.submission.employee_name}
                  </p>
                  <p>
                    <strong>Module:</strong> {reviewDialog.submission.module_title}
                  </p>
                  <p>
                    <strong>Course:</strong> {reviewDialog.submission.course_title}
                  </p>
                  <div className="flex gap-4 mt-3">
                    {reviewDialog.submission.github_url && (
                      <a
                        href={reviewDialog.submission.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                      >
                        <Link2 className="w-4 h-4" />
                        View GitHub Repository
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {reviewDialog.submission.hosted_url && (
                      <a
                        href={reviewDialog.submission.hosted_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                      >
                        <Globe className="w-4 h-4" />
                        View Live Demo
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="feedback">
                Feedback {reviewDialog.action === "reject" && "(Required)"}
              </Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={
                  reviewDialog.action === "approve"
                    ? "Great work! (optional)"
                    : "Please explain what needs to be improved..."
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setReviewDialog({ open: false, action: null, submission: null })
              }
              disabled={reviewing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={reviewing}
              className={
                reviewDialog.action === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : ""
              }
              variant={reviewDialog.action === "reject" ? "destructive" : "default"}
            >
              {reviewing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {reviewDialog.action === "approve" ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
