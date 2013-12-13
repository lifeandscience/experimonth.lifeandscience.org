/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name : [(process.env.BASEURL == 'http://science.experimonth.com' ? 'science.experimonth.com' : (process.env.BASEURL == 'http://app.dev:8000' ? 'dev.science.experimonth.com' : 'testing.science.experimonth.com'))],
  /**
   * Your New Relic license key.
   */
  license_key : '9325042c9607eb25ff3714d5116b48df3608b1ae',
  logging : {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level : 'trace'
  }
};
