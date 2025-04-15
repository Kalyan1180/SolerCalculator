<script>
export default {
  name: "ProjectDetail",
  props: ["projectId"],
  mounted() {
    console.log("Project ID:", this.projectId);
    // Fetch further details using the projectId...
  }
};
</script>
