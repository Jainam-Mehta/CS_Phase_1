variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "exalted-skein-505210-g0"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "asia-south1"
}

variable "cluster_name" {
  description = "GKE cluster name"
  type        = string
  default     = "coldsense-gke"
}