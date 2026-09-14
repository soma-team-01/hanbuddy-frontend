# Only simple apex A and optional www CNAME records are managed here.
# Reject unexpected routing/IPv6 records instead of silently leaving split traffic.
.ResourceRecordSets as $records
| [
    {Name: ($domain + "."), Type: "A", TTL: 60, ResourceRecords: [{Value: $ip}]},
    (if $redirect != "" then
      {Name: ($redirect + "."), Type: "CNAME", TTL: 60, ResourceRecords: [{Value: ($domain + ".")}]}
    else empty end)
  ] as $desired
| [ $desired[] as $new
    | [$records[] | select(.Name == $new.Name)] as $same_name
    | [$same_name[] | select(.Type == $new.Type)] as $old
    | if ($old | length) > 1
        or any($old[]; has("SetIdentifier") or has("TrafficPolicyInstanceId") or has("HealthCheckId") or .MultiValueAnswer == true)
        or any($same_name[];
          if $new.Type == "CNAME" then .Type != "CNAME"
          else .Type == "AAAA" or .Type == "CNAME" end)
      then error("Unsupported DNS records for " + $new.Name + "; review manually before cutover")
      else {new: $new, old: ($old[0] // null)} end
  ] as $changes
| {
    apply: {Changes: [$changes[] | {Action: "UPSERT", ResourceRecordSet: .new}]},
    rollback: {Changes: [$changes[] |
      if .old == null then {Action: "DELETE", ResourceRecordSet: .new}
      else {Action: "UPSERT", ResourceRecordSet: .old} end]}
  }
