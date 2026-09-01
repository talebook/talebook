from webserver import loader
from webserver.services.async_service import AsyncService
from webserver.services.plugin_runtime import PluginRuntime


@AsyncService.register_service
def execute_plugin_run(service, run_id):
    """Execute one previously persisted run on the shared background queue."""

    return PluginRuntime(service.session, loader.get_settings(), calibre_db=service.db).execute(run_id)
