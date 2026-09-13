# ColdSense Terraform Variables

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "exalted-skein-505210-g0"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-south1"
}

variable "zone" {
  description = "GCP Zone"
  type        = string
  default     = "asia-south1-c"
}

variable "vm_machine_type" {
  description = "VM machine type"
  type        = string
  default     = "e2-medium"  # 2 vCPU, 4GB RAM - $36/month
}
