const allowedApiRoute = /^(login|register|logout|password-reset(?:\/confirm)?|admin\/(users|stats|classes|classes\/\d+|students|students\/\d+|students\/\d+\/class|teachers|teachers\/\d+|subjects|subjects\/\d+|sessions|sessions\/\d+|grades|grades\/\d+)|teacher\/(subjects|students|classes|grades|grades\/record\/\d+)|student\/(grades|profile)|course-enrollments(?:\/\d+)?|attendance-sessions(?:\/\d+)?|attendance-records(?:\/\d+)?)$/;

export function isAllowedApiRoute(endpoint: string) {
  return allowedApiRoute.test(endpoint);
}
